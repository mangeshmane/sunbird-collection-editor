import { Injectable, EventEmitter } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import * as _ from 'lodash-es';
import { TreeService } from '../tree/tree.service';
import { PublicDataService } from '../public-data/public-data.service';
import { IEditorConfig } from '../../interfaces/editor';
import { ConfigService } from '../config/config.service';
import { ToasterService} from '../../services/toaster/toaster.service';
import { EditorTelemetryService } from '../../services/telemetry/telemetry.service';
import { DataService } from '../data/data.service';
import { map } from 'rxjs/operators';

interface SelectedChildren {
  primaryCategory?: string;
  mimeType?: string;
  interactionType?: string;
}
@Injectable({ providedIn: 'root' })

export class EditorService {
  data: any = {};
  private _selectedChildren: SelectedChildren = {};
  public questionStream$ = new Subject<any>();
  private _editorConfig: IEditorConfig;
  private _editorMode = 'edit';
  public showLibraryPage: EventEmitter<number> = new EventEmitter();

  constructor(public treeService: TreeService, private toasterService: ToasterService,
              public configService: ConfigService, private telemetryService: EditorTelemetryService,
              private publicDataService: PublicDataService, private dataService: DataService) { }

  public initialize(config: IEditorConfig) {
    this._editorConfig = config;
    if (this.configService.editorConfig && this.configService.editorConfig.default) {
      this._editorConfig.config = _.assign(this.configService.editorConfig.default, this._editorConfig.config);
    }
    this._editorMode = _.get(this._editorConfig, 'config.mode').toLowerCase();
  }

  set selectedChildren(value: SelectedChildren) {
    if (value.mimeType) {
      this._selectedChildren.mimeType = value.mimeType;
    }
    if (value.primaryCategory) {
      this._selectedChildren.primaryCategory = value.primaryCategory;
    }
    if (value.interactionType) {
      this._selectedChildren.interactionType = value.interactionType;
    }
  }

  get selectedChildren() {
    return this._selectedChildren;
  }

  public get editorConfig(): IEditorConfig {
    return this._editorConfig;
  }

  get editorMode() {
    return this._editorMode;
  }

  get contentPolicyUrl() {
    const url = _.get(this.editorConfig, 'config.contentPolicyUrl');
    return url ? url : this.configService.urlConFig.ContentPolicyUrl;
  }

  getToolbarConfig() {
    return _.cloneDeep(_.merge(this.configService.labelConfig.button_labels, _.get(this.editorConfig, 'context.labels')));
  }

  emitshowLibraryPageEvent(page) {
    this.showLibraryPage.emit(page);
  }
  getshowLibraryPageEmitter() {
    return this.showLibraryPage;
  }

  getQuestionList(questionIds: string[]): Observable<any> {
    const option = {
      url: 'question/v1/list',
      data: {
        request: {
          search: {
            identifier: questionIds
          }
        }
      }
    };
    return this.dataService.post(option).pipe(map(data => _.get(data, 'result')));
  }

  fetchCollectionHierarchy(collectionId): Observable<any> {
    const url = this.configService.urlConFig.URLS[this.editorConfig.config.objectType];
    const hierarchyUrl = `${url.HIERARCHY_READ}/${collectionId}`;
    const req = {
      url: hierarchyUrl,
      param: { mode: 'edit' }
    };
    return this.publicDataService.get(req);
  }

  readQuestionSet(questionSetId, option: any = { params: {} }): Observable<any> {
    const url = this.configService.urlConFig.URLS[this.editorConfig.config.objectType];
    const param = {
      mode: 'edit',
      fields: url.DEFAULT_PARAMS_FIELDS
    };
    const hierarchyUrl = `${url.READ}/${questionSetId}`;
    const req = {
      url: hierarchyUrl,
      param: { ...param, ...option.params }
    };
    return this.publicDataService.get(req);
  }

  fetchContentDetails(contentId) {
    const req = {
      url: 'content/v3/read/' + contentId
    };
    return this.publicDataService.get(req);
  }

  updateHierarchy(): Observable<any> {
    const url = this.configService.urlConFig.URLS[this.editorConfig.config.objectType];
    const req = {
      url: url.HIERARCHY_UPDATE,
      data: {
        request: {
          data: {
            ...this.getCollectionHierarchy(),
            ...{lastUpdatedBy: _.get(this.editorConfig, 'context.user.id')}
          }
        }
      }
    };
    return this.publicDataService.patch(req);
  }

  reviewContent(contentId): Observable<any> {
    let objType = this.configService.categoryConfig[this.editorConfig.config.objectType];
    objType = objType.toLowerCase();
    const url = this.configService.urlConFig.URLS[this.editorConfig.config.objectType];
    const option = {
      url: url.CONTENT_REVIEW + contentId,
      data: {
        request: {
          [objType]: {}
        }
      }
    };
    return this.publicDataService.post(option);
  }

  submitRequestChanges(contentId, comment) {
    let objType = this.configService.categoryConfig[this.editorConfig.config.objectType];
    objType = objType.toLowerCase();
    const url = this.configService.urlConFig.URLS[this.editorConfig.config.objectType];
    const requestBody = {
      request: {
        [objType]: {
          rejectComment: _.trim(comment)
        }
      }
    };
    const option = {
      url: `${url.CONTENT_REJECT}${contentId}`,
      data: requestBody
    };
    return this.publicDataService.post(option);
  }

  publishContent(contentId) {
    let objType = this.configService.categoryConfig[this.editorConfig.config.objectType];
    objType = objType.toLowerCase();
    const url = this.configService.urlConFig.URLS[this.editorConfig.config.objectType];
    const requestBody = {
      request: {
        [objType]: {
          lastPublishedBy: this.editorConfig.context.user.id
        }
      }
    };
    const option = {
      url: `${url.CONTENT_PUBLISH}${contentId}`,
      data: requestBody
    };
    return this.publicDataService.post(option);
  }

  addResourceToHierarchy(collection, unitIdentifier, contentId): Observable<any> {
    const req = {
      url: 'content/v3/hierarchy/add',
      data: {
        request: {
          rootId: collection,
          unitId: unitIdentifier,
          children: [contentId]
        }
      }
    };
    return this.publicDataService.patch(req);
  }

  public getQuestionStream$() {
    return this.questionStream$;
  }

  public publish(value: any) {
    this.questionStream$.next(value);
  }

  async getMaxScore() {
    const rootNode = this.treeService.getFirstChild();
    const metadata = _.get(rootNode, 'data.metadata');
    if (metadata.shuffle) {
      const childrens = _.map(rootNode.getChildren(), (child) =>  child.data.id);
      if (metadata.maxQuestions && !_.isEmpty(childrens) ) {
        const { questions } =  await this.getQuestionList(_.take(childrens, metadata.maxQuestions)).toPromise();
        const maxScore = this.calculateMaxScore(questions);
        return maxScore;
      } else {
        return rootNode.countChildren();
      }
    } else {
      return metadata.maxQuestions ? metadata.maxQuestions :  rootNode.countChildren();
    }
  }

  calculateMaxScore(questions: Array<any>) {
   return _.reduce(questions, (sum, question) => {
      return sum + (question.responseDeclaration ? _.get(question, 'responseDeclaration.response1.maxScore') : 1);
    }, 0);
  }

  getCollectionHierarchy() {
    const instance = this;
    this.data = {};
    const data = this.treeService.getFirstChild();
    return {
      nodesModified: this.treeService.treeCache.nodesModified,
      hierarchy: instance._toFlatObj(data)
    };
  }

  _toFlatObj(data, questionId?, selectUnitId?) {
    const instance = this;
    if (data && data.data) {
      instance.data[data.data.id] = {
        name: data.title,
        children: _.map(data.children, (child) => {
          return child.data.id;
        }),
        root: data.data.root
      };
      if (questionId && selectUnitId && selectUnitId === data.data.id) {
          instance.data[data.data.id].children.push(questionId);
      }
      if (questionId && selectUnitId && data.folder === false) {
          delete instance.data[data.data.id];
      }
      _.forEach(data.children, (collection) => {
        instance._toFlatObj(collection, questionId, selectUnitId);
      });
    }
    return instance.data;
  }

  getCategoryDefinition(categoryName, channel, objectType?: any) {
    const req = {
      url: 'object/category/definition/v1/read?fields=objectMetadata,forms,name',
      data: {
        request: {
          objectCategoryDefinition: {
              objectType: objectType ? objectType : 'Content',
              name: categoryName,
              ...(channel && { channel })
          },
        }
      }
    };
    return this.publicDataService.post(req);
  }
  fetchContentListDetails(req) {
    return this.publicDataService.post(req);
  }
  sort(a, b, column) {
    if (!this.isNotEmpty(a, column) || !this.isNotEmpty(b, column)) {
      return 1;
    }
    let aColumn = a[column];
    let bColumn = b[column];
    if (_.isArray(aColumn)) {
      aColumn = _.join(aColumn, ', ');
    }
    if (_.isArray(bColumn)) {
      bColumn = _.join(bColumn, ', ');
    }
    if (_.isNumber(aColumn)) {
    aColumn = _.toString(aColumn);
    }
    if (_.isNumber(bColumn)) {
    bColumn = _.toString(bColumn);
    }
    return bColumn.localeCompare(aColumn);
  }
  isNotEmpty(obj, key) {
    if (_.isNil(obj) || _.isNil(obj[key])) {
      return false;
    }
    return true;
   }

   apiErrorHandling(err, errorInfo) {
    if (_.get(err, 'error.params.errmsg') || errorInfo.errorMsg) {
      this.toasterService.error(_.get(err, 'error.params.errmsg') || errorInfo.errorMsg);
    }
    const telemetryErrorData = {
        err: _.toString(err.status),
        errtype: 'SYSTEM',
        stacktrace: JSON.stringify({response: _.pick(err, ['error', 'url']), request: _.get(errorInfo, 'request')}) || errorInfo.errorMsg,
        pageid: this.telemetryService.telemetryPageId
    };
    this.telemetryService.error(telemetryErrorData);
  }


}
