import type { Editor } from 'ckeditor5';

import { beforeEach, describe, expect, it } from 'vitest';

import { cleanupOrphanEditorElements } from './cleanup-orphan-editor-elements';

describe('cleanupOrphanEditorElements', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should remove uiElement from the DOM if it is connected', () => {
    const uiElement = document.createElement('div');
    document.body.appendChild(uiElement);

    const mockEditor = {
      ui: { element: uiElement },
    } as unknown as Editor;

    expect(uiElement.isConnected).toBe(true);

    cleanupOrphanEditorElements(mockEditor);

    expect(uiElement.isConnected).toBe(false);
  });

  it('should not remove uiElement from the DOM if it has proper attribute', () => {
    const uiElement = document.createElement('div');

    uiElement.setAttribute('data-cke-controlled', '');
    document.body.appendChild(uiElement);

    const mockEditor = {
      ui: { element: uiElement },
    } as unknown as Editor;

    expect(uiElement.isConnected).toBe(true);

    cleanupOrphanEditorElements(mockEditor);

    expect(uiElement.isConnected).toBe(true);
  });

  it('should not throw an error if uiElement is not connected or does not exist', () => {
    const uiElement = document.createElement('div');

    const mockEditor = {
      ui: { element: uiElement },
    } as unknown as Editor;

    expect(() => cleanupOrphanEditorElements(mockEditor)).not.toThrow();
    expect(() => cleanupOrphanEditorElements({ ui: {} } as Editor)).not.toThrow();
  });

  it('should remove toolbar element from the DOM if it is connected', () => {
    const toolbarElement = document.createElement('div');
    document.body.appendChild(toolbarElement);

    const mockEditor = {
      ui: {
        view: {
          toolbar: { element: toolbarElement },
        },
      },
    } as unknown as Editor;

    expect(toolbarElement.isConnected).toBe(true);

    cleanupOrphanEditorElements(mockEditor);

    expect(toolbarElement.isConnected).toBe(false);
  });

  it('should clear toolbar element instead of removing it when it has data-cke-controlled', () => {
    const toolbarElement = document.createElement('div');
    toolbarElement.setAttribute('data-cke-controlled', '');
    toolbarElement.innerHTML = '<button>Bold</button>';
    document.body.appendChild(toolbarElement);

    const mockEditor = {
      ui: {
        view: {
          toolbar: { element: toolbarElement },
        },
      },
    } as unknown as Editor;

    expect(toolbarElement.isConnected).toBe(true);

    cleanupOrphanEditorElements(mockEditor);

    expect(toolbarElement.isConnected).toBe(true);
    expect(toolbarElement.innerHTML).toBe('');
  });

  it('should not throw if toolbar element is absent', () => {
    const mockEditor = {
      ui: {
        view: {
          toolbar: {},
        },
      },
    } as unknown as Editor;

    expect(() => cleanupOrphanEditorElements(mockEditor)).not.toThrow();
  });

  it('should remove menuBarView element from the DOM if it is connected', () => {
    const menuBarElement = document.createElement('div');
    document.body.appendChild(menuBarElement);

    const mockEditor = {
      ui: {
        view: {
          menuBarView: { element: menuBarElement },
        },
      },
    } as unknown as Editor;

    expect(menuBarElement.isConnected).toBe(true);

    cleanupOrphanEditorElements(mockEditor);

    expect(menuBarElement.isConnected).toBe(false);
  });

  it('should clear menuBarView element instead of removing it when it has data-cke-controlled', () => {
    const menuBarElement = document.createElement('div');
    menuBarElement.setAttribute('data-cke-controlled', '');
    menuBarElement.innerHTML = '<nav>File Edit</nav>';
    document.body.appendChild(menuBarElement);

    const mockEditor = {
      ui: {
        view: {
          menuBarView: { element: menuBarElement },
        },
      },
    } as unknown as Editor;

    expect(menuBarElement.isConnected).toBe(true);

    cleanupOrphanEditorElements(mockEditor);

    expect(menuBarElement.isConnected).toBe(true);
    expect(menuBarElement.innerHTML).toBe('');
  });

  it('should not throw if menuBarView element is absent', () => {
    const mockEditor = {
      ui: {
        view: {
          menuBarView: {},
        },
      },
    } as unknown as Editor;

    expect(() => cleanupOrphanEditorElements(mockEditor)).not.toThrow();
  });

  it('should remove all three ui elements when all are connected', () => {
    const uiElement = document.createElement('div');
    const toolbarElement = document.createElement('div');
    const menuBarElement = document.createElement('div');

    document.body.append(uiElement, toolbarElement, menuBarElement);

    const mockEditor = {
      ui: {
        element: uiElement,
        view: {
          toolbar: { element: toolbarElement },
          menuBarView: { element: menuBarElement },
        },
      },
    } as unknown as Editor;

    cleanupOrphanEditorElements(mockEditor);

    expect(uiElement.isConnected).toBe(false);
    expect(toolbarElement.isConnected).toBe(false);
    expect(menuBarElement.isConnected).toBe(false);
  });

  it('should remove _bodyCollectionContainer from the DOM if it is connected', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const mockEditor = {
      ui: {
        view: {
          body: {
            _bodyCollectionContainer: container,
          },
        },
      },
    } as unknown as Editor;

    expect(container.isConnected).toBe(true);
    cleanupOrphanEditorElements(mockEditor);
    expect(container.isConnected).toBe(false);
  });

  it('should clean up corresponding attributes and classes from domRoots', () => {
    const rootElement = document.createElement('div');

    rootElement.setAttribute('contenteditable', 'true');
    rootElement.setAttribute('role', 'textbox');
    rootElement.setAttribute('aria-label', 'Rich Text Editor');
    rootElement.setAttribute('aria-multiline', 'true');
    rootElement.setAttribute('spellcheck', 'false');

    rootElement.classList.add(
      'ck',
      'ck-content',
      'ck-editor__editable',
      'ck-rounded-corners',
      'ck-editor__editable_inline',
      'ck-blurred',
      'ck-focused',
      'my-custom-class',
    );

    const domRoots = new Map();
    domRoots.set('main', rootElement);

    const mockEditor = {
      editing: {
        view: {
          domRoots,
        },
      },
    } as unknown as Editor;

    cleanupOrphanEditorElements(mockEditor);

    expect(rootElement.hasAttribute('contenteditable')).toBe(false);
    expect(rootElement.hasAttribute('role')).toBe(false);
    expect(rootElement.hasAttribute('aria-label')).toBe(false);
    expect(rootElement.hasAttribute('aria-multiline')).toBe(false);
    expect(rootElement.hasAttribute('spellcheck')).toBe(false);

    const removedClasses = [
      'ck',
      'ck-content',
      'ck-editor__editable',
      'ck-rounded-corners',
      'ck-editor__editable_inline',
      'ck-blurred',
      'ck-focused',
    ];

    removedClasses.forEach((className) => {
      expect(rootElement.classList.contains(className)).toBe(false);
    });

    expect(rootElement.classList.contains('my-custom-class')).toBe(true);
  });

  it('should ignore objects in domRoots that are not instances of HTMLElement', () => {
    const fakeRoot = {
      removeAttribute: () => {},
      classList: { remove: () => {} },
    };

    const domRoots = new Map();
    domRoots.set('main', fakeRoot);

    const mockEditor = {
      editing: {
        view: {
          domRoots,
        },
      },
    } as unknown as Editor;

    expect(() => cleanupOrphanEditorElements(mockEditor)).not.toThrow();
  });

  it('should fail gracefully on an empty editor object', () => {
    const emptyEditor = {} as unknown as Editor;

    expect(() => cleanupOrphanEditorElements(emptyEditor)).not.toThrow();
  });
});
