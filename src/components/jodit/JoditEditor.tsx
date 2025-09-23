import React, { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

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

    // prepare handler for image insertion
    const toBase64 = (f: File) => new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(f);
    });

    const imageHandler = function(this: any) {
      // 'this' is toolbar module context sometimes; use quillRef
      if (!inputFileRef.current) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        input.addEventListener('change', async () => {
          const file = input.files && input.files[0];
          if (!file) return;

          let url: string | null = null;
          if (config && typeof config.uploadImage === 'function') {
            try {
              url = await config.uploadImage(file);
            } catch (e) {
              url = await toBase64(file);
            }
          } else {
            url = await toBase64(file);
          }

          if (url && quillRef.current) {
            const range = quillRef.current.getSelection(true);
            quillRef.current.insertEmbed(range.index, 'image', url, 'user');
            quillRef.current.setSelection(range.index + 1, 0);
          }
          input.value = '';
        });
        document.body.appendChild(input);
        inputFileRef.current = input;
      }
      inputFileRef.current.click();
    };

    // create editor
    const editorContainer = containerRef.current as HTMLElement;
    const toolbarContainer = toolbarRef.current as HTMLElement | null;

    // Initialize Quill using the toolbar container we render in JSX (deterministic)
    quillRef.current = new Quill(editorContainer, {
      theme: (config && config.theme) || 'snow',
      modules: {
        toolbar: toolbarContainer ? { container: toolbarContainer, handlers: { image: imageHandler } } : { container: toolbarOptions, handlers: { image: imageHandler } },
        ...(config && config.modules),
      },
      ...config,
    });

    // set initial content
    try {
      quillRef.current.root.innerHTML = value || '';
    } catch (e) {
      // ignore
    }

    const handler = () => {
      try {
        const html = quillRef.current.root.innerHTML;
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
        // clear editor DOM
        if (containerRef.current) containerRef.current.innerHTML = '';
        // clear toolbar DOM
        if (toolbarRef.current) toolbarRef.current.innerHTML = '';
      } catch (e) {
        // ignore
      }
      quillRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!quillRef.current) return;
    const current = quillRef.current.root.innerHTML || '';
    if (value !== current) quillRef.current.root.innerHTML = value || '';
  }, [value]);

  return (
    <div>
      <div ref={toolbarRef} className="ql-toolbar" aria-label="Editor toolbar">
        <span className="ql-formats">
          <select className="ql-header text-slate-900 dark:text-slate-200" defaultValue="">
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
          <button className="ql-image" aria-label="Image" />
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
      <div ref={containerRef} className="ql-container" />
    </div>
  );
};
