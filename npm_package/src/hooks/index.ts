import { ContextHook } from './context';
import { EditableHook } from './editable';
import { EditorHook } from './editor';
import { UIPartHook } from './ui-part';

export const Hooks = {
  CKEditor5: EditorHook,
  CKEditable: EditableHook,
  CKUIPart: UIPartHook,
  CKContext: ContextHook,
};
