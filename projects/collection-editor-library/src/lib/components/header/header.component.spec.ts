import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TelemetryInteractDirective } from '../../directives/telemetry-interact/telemetry-interact.directive';
import { EditorService } from '../../services/editor/editor.service';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [FormsModule, ReactiveFormsModule, HttpClientTestingModule],
      providers: [EditorService],
      declarations: [HeaderComponent, TelemetryInteractDirective],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    // fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
  it('Should call the component initialization', () => {
    spyOn(component, 'ngOnInit');
    component.ngOnInit();
    expect(component).toBeTruthy();
    expect(component.ngOnInit).toHaveBeenCalled();
  })

  it('should call handleActionButtons method', () => {
    spyOn(component, 'handleActionButtons');
    component.handleActionButtons();
    expect(component.handleActionButtons).toHaveBeenCalled();
  });

  it('Should call the getSourcingData method', () => {
    spyOn(component, 'getSourcingData');
    component.getSourcingData();
    expect(component.getSourcingData).toHaveBeenCalled();
  });

  it('#handleActionButtons() visibility should be defined ', () => {
    const editorservice = TestBed.get(EditorService);
    spyOn(editorservice, 'editorMode');
    component.handleActionButtons();
    expect(component.visibility).toBeDefined();
  });
  it('#openRequestChangePopup() should actionType defined', () => {
    component.openRequestChangePopup('sendForCorrections');
    expect(component.showRequestChangesPopup).toBeTruthy();
    expect(component.actionType).toBe('sendForCorrections');
  });
  it('#buttonEmitter() should call buttonEmitter', () => {
    const data = { type: 'previewContent' };
    spyOn(component.toolbarEmitter, 'emit');
    spyOn(component, 'buttonEmitter').and.returnValue(data);
    component.buttonEmitter(data);
    expect(component.buttonEmitter).toHaveBeenCalledWith(data);
  });
  it('#ngOnDestroy() should call modal deny method', () => {
    component.modal = {
      deny: jasmine.createSpy('deny')
    };
    component.ngOnDestroy();
    expect(component.modal.deny).toHaveBeenCalled();
  });
});
