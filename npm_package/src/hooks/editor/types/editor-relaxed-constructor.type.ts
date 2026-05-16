import type { Editor } from 'ckeditor5';

export type EditorRelaxedConstructor<TEditor extends Editor = Editor> = {
  create: (...args: any) => Promise<TEditor>;
  editorName?: string;
};
