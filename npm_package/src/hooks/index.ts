import { ContextHook } from './context';
import { EditableHook } from './editable';
import { EditorHook } from './editor';
import { RootValueSentinelHook } from './root-value-sentinel';
import { UIPartHook } from './ui-part';

export const Hooks = {
  CKEditor5: EditorHook,
  CKEditable: EditableHook,
  CKUIPart: UIPartHook,
  CKContext: ContextHook,
  CKRootValueSentinel: RootValueSentinelHook,
};
