import React, { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface Props {
  value: string;
  onChange: (val: string) => void;
  config?: Record<string, any>;
}

export const QuillWrapper: React.FC<Props> = ({ value, onChange, config }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // create editor
    quillRef.current = new Quill(containerRef.current, {
      theme: (config && config.theme) || 'snow',
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
        // Quill does not have a formal destructor; remove DOM
        if (containerRef.current) containerRef.current.innerHTML = '';
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

  return <div ref={containerRef} />;
};
