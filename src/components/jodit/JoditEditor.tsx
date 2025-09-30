import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

// Import Quill blots
const Inline = Quill.import('blots/inline');
const Block = Quill.import('blots/block');

// Custom Bold format that applies inline styles
class BoldInline extends Inline {
  static blotName = 'bold';
  static tagName = 'STRONG';
  
  static create() {
    const node = super.create();
    node.setAttribute('style', 'font-weight: bold;');
    return node;
  }
}

// Custom Italic format that applies inline styles
class ItalicInline extends Inline {
  static blotName = 'italic';
  static tagName = 'EM';
  
  static create() {
    const node = super.create();
    node.setAttribute('style', 'font-style: italic;');
    return node;
  }
}

// Custom Underline format that applies inline styles
class UnderlineInline extends Inline {
  static blotName = 'underline';
  static tagName = 'U';
  
  static create() {
    const node = super.create();
    node.setAttribute('style', 'text-decoration: underline;');
    return node;
  }
}

// Custom Header format that applies inline font-size styles
class HeaderBlock extends Block {
  static blotName = 'header';
  static tagName = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
  
  static create(value: string | number) {
    const level = typeof value === 'string' ? parseInt(value) : value;
    const tagName = `H${Math.min(Math.max(level, 1), 6)}`;
    const node = super.create(tagName);
    
    let styles = '';
    // Apply inline font-size based on header level
    switch(level) {
      case 1:
        styles = 'font-size: 2rem; font-weight: bold; margin: 1rem 0 0.5rem 0;';
        break;
      case 2:
        styles = 'font-size: 1.5rem; font-weight: bold; margin: 0.75rem 0 0.5rem 0;';
        break;
      case 3:
        styles = 'font-size: 1.25rem; font-weight: bold; margin: 0.5rem 0 0.25rem 0;';
        break;
      default:
        styles = 'font-size: 1rem; font-weight: bold;';
        break;
    }
    
    node.setAttribute('style', styles);
    return node;
  }
  
  static formats(node: HTMLElement) {
    return parseInt(node.tagName.charAt(1));
  }
}

// Use existing Quill align attributor but ensure it uses inline styles
const AlignStyle = Quill.import('attributors/style/align');

// Register custom formats
Quill.register(BoldInline, true);
Quill.register(ItalicInline, true);
Quill.register(UnderlineInline, true);
Quill.register(HeaderBlock, true);
Quill.register(AlignStyle, true);

interface Props {
  value: string;
  onChange: (val: string) => void;
  config?: Record<string, any>;
}

export const JoditWrapper: React.FC<Props> = ({ value, onChange, config }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<any>(null);
  const inputFileRef = useRef<HTMLInputElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  // track last html emitted from quill to avoid echoing prop updates back into the editor
  const lastQuillHtmlRef = useRef<string | null>(null);
  // guard to indicate we are programmatically applying content to the editor
  const isApplyingRef = useRef<boolean>(false);
  // track if user is actively focused/typing in the editor
  const hasFocusRef = useRef<boolean>(false);
  // modal state for image insertion
  const [imgModalOpen, setImgModalOpen] = useState(false);
  const [imgUrl, setImgUrl] = useState('');
  const [imgWidth, setImgWidth] = useState('');
  const [imgHeight, setImgHeight] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);

  // confirm insertion moved to component scope so modal can call it
  const confirmInsertImage = async () => {
    setImgError(null);
    let finalUrl = imgUrl && imgUrl.trim() ? imgUrl.trim() : undefined;
    try {
      if (!finalUrl && selectedFile) {
          if (config && typeof config.uploadImage === 'function') {
            finalUrl = await config.uploadImage(selectedFile);
          } else {
          setImgError('File upload is not supported (no uploadImage handler provided).');
          return;
          }
      }

      if (!finalUrl) {
        setImgError('Please provide an image URL or select a file to upload.');
        return;
      }

      const styles: string[] = [];
      if (imgWidth) styles.push(`width:${imgWidth.replace(/[^0-9.%]/g, '')}${/\D$/.test(imgWidth) ? '' : 'px'}`);
      if (imgHeight) styles.push(`height:${imgHeight.replace(/[^0-9.%]/g, '')}${/\D$/.test(imgHeight) ? '' : 'px'}`);
      // force display:block so margin auto will center the image when wrapped in a block
      if (!styles.some(s => /^display:/.test(s))) styles.unshift('display:block');
      const styleAttr = styles.length ? ` style="${styles.join(';')}"` : '';

      if (quillRef.current) {
        // preserve current selection so we can restore it after insertion
        const priorSel = quillRef.current.getSelection && quillRef.current.getSelection(true);
        const insertIndex = (priorSel && typeof priorSel.index === 'number') ? priorSel.index : (quillRef.current.getLength ? quillRef.current.getLength() : 0);
        // Wrap the image in a block (p) so alignment (text-align) applies to the block,
        // and centering works via text-align:center on that block.
        // Default: insert block with no alignment (left). If user chooses toolbar align afterwards,
        // toolbar handler (below) will set text-align on the block.
        const html = `<p>${`<img src="${finalUrl}" alt=""${styleAttr} />`}</p>`;
        // mark we're applying programmatically so the text-change handler ignores this event
        isApplyingRef.current = true;
        // insert HTML at the captured index
        quillRef.current.clipboard.dangerouslyPasteHTML(insertIndex, html);
        // move selection to just after the inserted node
        try {
          quillRef.current.setSelection(insertIndex + 1, 0);
          quillRef.current.focus && quillRef.current.focus();
        } catch (e) {
          // ignore selection errors
        }
        const htmlNow = quillRef.current.root.innerHTML;
        lastQuillHtmlRef.current = htmlNow;
        onChange(htmlNow);
        // clear the applying flag on next tick so normal typing resumes
        setTimeout(() => {
          isApplyingRef.current = false;
        }, 0);
      }
      setImgModalOpen(false);
      } catch (err: any) {
        setImgError(err?.message || 'Upload failed');
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // custom toolbar with justify/align and image handler
    const toolbarOptions = [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      ['link', 'image'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
    ];

    // Image handler now prompts for an image URL and optional size, inserts an <img> tag
    const imageHandler = function(this: any) {
      try {
        setImgError(null);
        setImgUrl('');
        setImgWidth('');
        setImgHeight('');
        setSelectedFile(null);
        setImgModalOpen(true);
      } catch (err) {
        // ignore
      }
    };

    // create editor
    const editorContainer = containerRef.current as HTMLElement;
    const toolbarContainer = toolbarRef.current as HTMLElement | null;

    // Initialize Quill using the toolbar container we render in JSX (deterministic)
    quillRef.current = new Quill(editorContainer, {
      theme: (config && config.theme) || 'snow',
      modules: {
        toolbar: toolbarContainer
          ? { container: toolbarContainer, handlers: { image: imageHandler } }
          : { container: toolbarOptions, handlers: { image: imageHandler } },
        ...(config && config.modules),
      },
      // explicitly allow header format + common formats to avoid accidental format restrictions
      formats: [
        'header',
        'bold',
        'italic',
        'underline',
        'link',
        'image',
        'list',
        'align'
      ],
      ...config,
    });

    // ensure editor is enabled and focusable
    try {
      quillRef.current.enable && quillRef.current.enable(true);
      if (quillRef.current && quillRef.current.root) {
        quillRef.current.root.setAttribute('contenteditable', 'true');
        quillRef.current.root.setAttribute('tabindex', '0');
      }
    } catch (e) {}

    // clicking the container should focus Quill so typing becomes possible
    const onContainerClick = () => {
      try {
        quillRef.current && typeof quillRef.current.focus === 'function' && quillRef.current.focus();
      } catch (e) {}
    };
    try {
      editorContainer.addEventListener('click', onContainerClick);
      (quillRef.current as any).__containerClickCleanup = () => editorContainer.removeEventListener('click', onContainerClick);
    } catch (e) {}

    // track focus/blur to prevent external prop updates while user is typing
    const onFocus = () => {
      hasFocusRef.current = true;
    };
    const onBlur = () => {
      hasFocusRef.current = false;
    };
    try {
      if (quillRef.current && quillRef.current.root) {
        quillRef.current.root.addEventListener('focus', onFocus);
        quillRef.current.root.addEventListener('blur', onBlur);
        (quillRef.current as any).__focusCleanup = () => {
          quillRef.current.root.removeEventListener('focus', onFocus);
          quillRef.current.root.removeEventListener('blur', onBlur);
        };
      }
    } catch (e) {}

    // expose quill instance for quick manual debugging in browser console
    try {
      (window as any).__quillInstance = quillRef.current;
      console.debug('[JoditWrapper] quill instance exposed to window.__quillInstance');
    } catch (e) {}

    // set initial content
    try {
      // apply initial content using Quill's clipboard conversion to preserve internal state
      try {
        isApplyingRef.current = true;
        const delta = quillRef.current.clipboard.convert(value || '');
        quillRef.current.setContents(delta, 'silent');
      } finally {
        setTimeout(() => { isApplyingRef.current = false; }, 0);
      }
    } catch (e) {
      // ignore
    }

    // also attach via toolbar module API as a robust fallback
    try {
      const toolbarModule = quillRef.current.getModule && quillRef.current.getModule('toolbar');
      if (toolbarModule && typeof toolbarModule.addHandler === 'function') {
        toolbarModule.addHandler('header', (value: any) => {
          try {
            console.debug('[JoditWrapper] toolbar header handler value=', value);
            if (!quillRef.current) return;
            const sel = quillRef.current.getSelection(true);
            console.debug('[JoditWrapper] selection before header format=', sel);
            quillRef.current.format('header', value === '' ? false : Number(value));
            if (sel) quillRef.current.setSelection(sel.index, sel.length);
            console.debug('[JoditWrapper] html after header format=', quillRef.current.root.innerHTML);
          } catch (err) {
            console.error('[JoditWrapper] header handler error', err);
          }
        });
        toolbarModule.addHandler('align', (value: any) => {
          try {
            console.debug('[JoditWrapper] toolbar align handler value=', value);
            if (!quillRef.current) return;
            const sel = quillRef.current.getSelection(true);
            console.debug('[JoditWrapper] selection before align format=', sel);
            quillRef.current.format('align', value === '' ? false : value);
            if (sel) quillRef.current.setSelection(sel.index, sel.length);
            console.debug('[JoditWrapper] html after align format=', quillRef.current.root.innerHTML);
            // If the selection targets an image leaf, apply the alignment to the parent block (p/div)
            try {
              if (sel && typeof sel.index === 'number') {
                const [leaf] = quillRef.current.getLeaf(sel.index);
                const dom = leaf && leaf.domNode;
                if (dom && dom.tagName === 'IMG') {
                  const parentBlock = dom.closest('p, div, figure');
                  if (parentBlock) {
                    if (!value) parentBlock.style.textAlign = '';
                    else parentBlock.style.textAlign = String(value);
                    // ensure image remains block-level when centering
                    dom.style.display = 'block';
                    if (value === 'center') {
                      dom.style.marginLeft = 'auto';
                      dom.style.marginRight = 'auto';
                    } else {
                      dom.style.marginLeft = '';
                      dom.style.marginRight = '';
                    }
                    // notify Quill about DOM change by updating innerHTML at the block range
                    const blockIndex = quillRef.current.getIndex(parentBlock);
                    // use dangerouslyPasteHTML to replace block content preserving Quill state
                    const newHtml = parentBlock.outerHTML;
                    quillRef.current.clipboard.dangerouslyPasteHTML(blockIndex, newHtml);
                  }
                }
              }
            } catch (err2) {
              // swallow secondary errors to avoid breaking editor
              console.debug('[JoditWrapper] align image DOM adjust failed', err2);
            }
          } catch (err) {
            console.error('[JoditWrapper] align handler error', err);
          }
        });
      }
    } catch (e) {
      // ignore
    }

  // If the toolbar is provided as a DOM node sometimes Quill doesn't wire
    // up the header select correctly in some environments. Add a fallback
    // listener that forces the header format when the select changes.
    try {
      if (toolbarContainer && quillRef.current) {
        const headerSelect = toolbarContainer.querySelector('.ql-header') as HTMLSelectElement | null;
  const headerHandler = () => {
          try {
            if (!quillRef.current) return;
            const sel = quillRef.current.getSelection(true);
            // get selected value; empty string -> remove header
            const value = (headerSelect && headerSelect.value) || '';
            // ensure we have a range to apply format to
            if (sel) {
              quillRef.current.format('header', value === '' ? false : Number(value));
              // keep selection after formatting
              quillRef.current.setSelection(sel.index, sel.length);
            }
          } catch (err) {
            // ignore
          }
        };
        if (headerSelect) headerSelect.addEventListener('change', headerHandler);

        // attach custom image button handler (use a bespoke class to avoid Quill's built-in handler)
        try {
          const imgBtn = toolbarContainer.querySelector('.image-custom-btn') as HTMLButtonElement | null;
          if (imgBtn) {
            const imgHandler = (ev?: Event) => {
              ev && ev.preventDefault();
              try {
                imageHandler.call(null);
              } catch (e) {}
            };
            imgBtn.addEventListener('click', imgHandler);
            (quillRef.current as any).__imgBtnCleanup = () => imgBtn.removeEventListener('click', imgHandler);
          }
        } catch (e) {}

        // cleanup: remove listener on destroy
        const origDestroy = () => {
          try {
            if (headerSelect) headerSelect.removeEventListener('change', headerHandler);
          } catch (e) {}
        };
        // attach to quillRef so cleanup code below can call it
        (quillRef.current as any).__headerCleanup = origDestroy;
      }
    } catch (e) {
      // ignore
    }

    const handler = () => {
      try {
        // ignore text-change events triggered by our programmatic writes
        if (isApplyingRef.current) return;
        const html = quillRef.current.root.innerHTML;
        // mark this html as coming from the editor, so the value prop won't be written back
        lastQuillHtmlRef.current = html;
        onChange(html);
      } catch (e) {
        // ignore
      }
    };

    quillRef.current.on('text-change', handler);

    return () => {
      try {
        quillRef.current.off && quillRef.current.off('text-change', handler);
        // remove file input if created
        if (inputFileRef.current && inputFileRef.current.parentNode) {
          inputFileRef.current.parentNode.removeChild(inputFileRef.current);
        }
        // cleanup focus listeners
        try {
          const focusCleanup = (quillRef.current as any) && (quillRef.current as any).__focusCleanup;
          if (typeof focusCleanup === 'function') focusCleanup();
        } catch (e) {}
        
        // cleanup container click listeners  
        try {
          const containerCleanup = (quillRef.current as any) && (quillRef.current as any).__containerClickCleanup;
          if (typeof containerCleanup === 'function') containerCleanup();
        } catch (e) {}
        
        // cleanup image button listeners
        try {
          const imgCleanup = (quillRef.current as any) && (quillRef.current as any).__imgBtnCleanup;
          if (typeof imgCleanup === 'function') imgCleanup();
        } catch (e) {}
        
        // clear editor DOM
        if (containerRef.current) containerRef.current.innerHTML = '';
        // clear toolbar DOM
        if (toolbarRef.current) toolbarRef.current.innerHTML = '';
        // call header cleanup if registered
        try {
          const cleanup = (quillRef.current as any) && (quillRef.current as any).__headerCleanup;
          if (typeof cleanup === 'function') cleanup();
        } catch (e) {}
      } catch (e) {
        // ignore
      }
      quillRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!quillRef.current) return;
    const current = quillRef.current.root.innerHTML || '';
    // if the incoming value matches the last html emitted by quill, don't rewrite the DOM
    if (lastQuillHtmlRef.current && value === lastQuillHtmlRef.current) return;
    // if user is actively focused/typing, skip external prop updates to avoid cursor jumps
    if (hasFocusRef.current) return;
    if (value !== current) {
      // Use Quill's clipboard conversion and setContents to avoid direct DOM writes
      try {
        const sel = quillRef.current.getSelection && quillRef.current.getSelection(true);
        isApplyingRef.current = true;
        const delta = quillRef.current.clipboard.convert(value || '');
        quillRef.current.setContents(delta, 'silent');
        // attempt to restore previous selection if present
        if (sel && typeof sel.index === 'number') {
          try {
            quillRef.current.setSelection(sel.index, sel.length || 0);
          } catch (e) {
            // ignore selection restore errors
          }
        }
      } catch (e) {
        // fallback to direct innerHTML if convert/setContents fails
        try {
          quillRef.current.root.innerHTML = value || '';
        } catch (ee) {
          // ignore
        }
      } finally {
        setTimeout(() => { isApplyingRef.current = false; }, 0);
      }
    }
  }, [value]);

  return (
    <div>
      <div ref={toolbarRef} className="ql-toolbar" aria-label="Editor toolbar">
        <span className="ql-formats">
          <select className="ql-header text-zinc-900 dark:text-zinc-200" defaultValue="">
            <option value="1">H1</option>
            <option value="2">H2</option>
            <option value="3">H3</option>
            <option value="">Normal</option>
          </select>
        </span>
        <span className="ql-formats">
          <button className="ql-bold" aria-label="Bold" />
          <button className="ql-italic" aria-label="Italic" />
          <button className="ql-underline" aria-label="Underline" />
        </span>
        <span className="ql-formats">
          <button className="ql-link" aria-label="Link" />
          <button className="image-custom-btn" aria-label="Image"><ImageIcon className="w-4 h-4" /></button>
        </span>
        <span className="ql-formats">
          <button className="ql-list" value="ordered" aria-label="Ordered list" />
          <button className="ql-list" value="bullet" aria-label="Bullet list" />
        </span>
        <span className="ql-formats">
          <select className="ql-align">
            <option value=""></option>
            <option value="center"></option>
            <option value="right"></option>
            <option value="justify"></option>
          </select>
        </span>
      </div>
      <div className="relative">
        <div ref={containerRef} className="ql-container min-h-[200px] p-2 border rounded bg-background text-body" />
      </div>
      {/* Image insertion modal */}
      <Dialog open={imgModalOpen} onOpenChange={(v) => setImgModalOpen(Boolean(v))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Inserir imagem</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <label className="text-sm">URL pública</label>
            <input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} className="input" placeholder="https://..." />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm">Width</label>
                <input value={imgWidth} onChange={(e) => setImgWidth(e.target.value)} className="input" placeholder="e.g. 300 or 50%" />
              </div>
              <div>
                <label className="text-sm">Height</label>
                <input value={imgHeight} onChange={(e) => setImgHeight(e.target.value)} className="input" placeholder="e.g. 200 or 50%" />
              </div>
            </div>

            <div>
              <label className="text-sm">Ou selecione um arquivo (upload)</label>
              <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} />
            </div>

            {imgError && <div className="text-sm text-destructive">{imgError}</div>}
          </div>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <button type="button" className='btn btn-primary' onClick={() => setImgModalOpen(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" onClick={() => confirmInsertImage()}>Inserir</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
