import { useRef, useEffect, useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTheme } from './theme-provider';

interface TinyMceEditorProps {
    value: string;
    onChange: (value: string) => void;
}

function TinyMceEditor({ value, onChange }: TinyMceEditorProps) {
    const editorRef = useRef<any>(null);
    const mountedRef = useRef(false);
    const currentTheme = useTheme();
    // unescape server-encoded HTML strings like: "<h1 style=\"...\">...</h1>\n<p>...</p>"
    const unescapeServerHtml = (raw: unknown): string => {
        if (typeof raw !== 'string') return '';
        let s = raw;
        // common escaped sequences from JSON-encoded HTML
        s = s.replace(/\\"/g, '"')
             .replace(/\\'/g, "'")
             .replace(/\\n/g, '\n')
             .replace(/\\r/g, '\r')
             .replace(/\\t/g, '\t')
             .replace(/\\\//g, '/')
             .replace(/\\\\/g, '\\')
             .replace(/\u2028/g, '\\u2028')
             .replace(/\u2029/g, '\\u2029');
        return s;
    };

    // derive theme directly from provider and track a tick to force remount immediately
    const theme = currentTheme.theme === 'dark' ? 'dark' : 'light';
    const [themeTick, setThemeTick] = useState(0);
    useEffect(() => {
        // increment tick and reset mountedRef so Editor will re-init with new skin/content_style
        setThemeTick(t => t + 1);
        mountedRef.current = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTheme.theme]);

    // video modal state
    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const [videoUrl, setVideoUrl] = useState('');
    const [videoWidth, setVideoWidth] = useState('');
    const [videoHeight, setVideoHeight] = useState('');
    const [videoResponsive, setVideoResponsive] = useState(true);
    // bookmark to restore selection where video will be inserted
    const bookmarkRef = useRef<any>(null);

    // helper to build embeddable src from common video URLs
    const getVideoEmbedSrc = (url: string) => {
        try {
            const u = new URL(url.trim());
            const host = u.hostname.toLowerCase();
            // YouTube
            if (host.includes('youtube.com')) {
                const v = u.searchParams.get('v');
                if (v) return `https://www.youtube.com/embed/${v}`;
                const pathParts = u.pathname.split('/').filter(Boolean);
                const embedIdx = pathParts.indexOf('embed');
                if (embedIdx >= 0 && pathParts[embedIdx + 1]) return `https://www.youtube.com/embed/${pathParts[embedIdx + 1]}`;
                return url;
            }
            if (host === 'youtu.be') {
                const id = u.pathname.split('/').filter(Boolean)[0];
                if (id) return `https://www.youtube.com/embed/${id}`;
                return url;
            }
            // Vimeo
            if (host.includes('vimeo.com')) {
                const id = u.pathname.split('/').filter(Boolean)[0];
                if (id) return `https://player.vimeo.com/video/${id}`;
                return url;
            }
            return url;
        } catch (e) {
            return url;
        }
    };

    // Sync incoming `value` to editor only when editor is mounted.
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        try {
            const processed = unescapeServerHtml(value);
            const current = editor.getContent({ format: 'html' }) || '';
            if ((processed || '') === (current || '')) return;

            let bookmark: any = null;
            try {
                if (editor.selection && typeof editor.selection.getBookmark === 'function') {
                    bookmark = editor.selection.getBookmark(2);
                }
            } catch (e) {
                // ignore
            }

            editor.setContent(processed || '');

            try {
                if (bookmark && editor.selection && typeof editor.selection.moveToBookmark === 'function') {
                    editor.selection.moveToBookmark(bookmark);
                    if (typeof editor.focus === 'function') editor.focus();
                }
            } catch (e) {
                // ignore
            }
        } catch (e) {
            // swallow sync errors
        }
    }, [value]);

    const openVideoModalWithBookmark = () => {
        const editor = editorRef.current;
        if (editor && editor.selection && typeof editor.selection.getBookmark === 'function') {
            try {
                bookmarkRef.current = editor.selection.getBookmark(2);
            } catch (e) {
                bookmarkRef.current = null;
            }
        } else {
            bookmarkRef.current = null;
        }
        setVideoUrl('');
        setVideoWidth('');
        setVideoHeight('');
        setVideoResponsive(true);
        setVideoModalOpen(true);
    };

    const insertVideoFromModal = () => {
        const editor = editorRef.current;
        if (!editor) {
            setVideoModalOpen(false);
            return;
        }
        const url = (videoUrl || '').trim();
        if (!url) {
            setVideoModalOpen(false);
            return;
        }
        const src = getVideoEmbedSrc(url);

        let html = '';
        if (videoResponsive) {
            html = `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;">` +
                `<iframe src="${src}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" frameborder="0" allowfullscreen></iframe>` +
                `</div><p></p>`;
        } else {
            const sanitize = (v: string, fallback: string) => {
                const s = (v || '').trim();
                if (!s) return `${fallback}px`;
                if (s.endsWith('%')) {
                    const num = s.slice(0, -1).replace(/[^\d]/g, '');
                    return num ? `${num}%` : '100%';
                }
                const num = s.replace(/[^\d]/g, '');
                return num ? `${num}px` : `${fallback}px`;
            };
            const w = sanitize(videoWidth, '560');
            const h = sanitize(videoHeight, '315');
            html = `<p style="text-align:center;margin:0 0 1em 0;"><iframe src="${src}" style="width:${w};height:${h};border:0;display:inline-block;" frameborder="0" allowfullscreen></iframe></p><p></p>`;
        }

        try {
            if (bookmarkRef.current && editor.selection && typeof editor.selection.moveToBookmark === 'function') {
                try {
                    editor.selection.moveToBookmark(bookmarkRef.current);
                } catch (e) {
                    // ignore restore errors
                }
            }
            const selRng = editor.selection && editor.selection.getRng && editor.selection.getRng();
            editor.execCommand('mceInsertContent', false, html);
            try {
                const rng = editor.selection.getRng();
                if (rng) {
                    rng.collapse(false);
                    editor.selection.setRng(rng);
                } else if (selRng && editor.selection) {
                    editor.selection.setRng(selRng);
                }
            } catch (e) {
                // ignore
            }
        } catch (e) {
            try {
                editor.insertContent(html);
            } catch (er) {
                // ignore
            }
        } finally {
            setVideoModalOpen(false);
            bookmarkRef.current = null;
        }

        try {
            const newHtml = editor.getContent({ format: 'html' }) || '';
            onChange(newHtml);
        } catch (e) {
            // ignore
        }
    };

    // derive content_style from CSS variables if available
    // (function removed - not currently used, but can be reinstated if needed for dynamic theming)

    // Editor key forces remount on theme change so skin/content_css take effect
    const editorKey = `tinymce-${theme}-${themeTick}`;

    return (
        <>
            <Editor
                key={editorKey}
                apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
                licenseKey='gpl'
                onInit={(_evt, editor) => {
                    editorRef.current = editor;
                    try {
                        editor.ui.registry.addButton('insertVideo', {
                            tooltip: 'Inserir vídeo (YouTube/Vimeo/URL)',
                            icon: 'embed',
                            onAction: () => {
                                openVideoModalWithBookmark();
                            }
                        });
                    } catch (e) {
                        // ignore registration errors
                    }

                    if (!mountedRef.current) {
                        try {
                            editor.setContent(unescapeServerHtml(value) || '');
                        } catch (e) {
                            // ignore
                        }
                        mountedRef.current = true;
                    }
                }}
                onEditorChange={(newValue) => onChange(newValue)}
                init={{
                    height: 500,
                    menubar: false,
                    plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                        'searchreplace', 'visualblocks', 'code', 'fullscreen', 'insertdatetime', 'media',
                        'table', 'help', 'wordcount'
                    ],
                    toolbar:
                        'undo redo | casechange | styles | bold italic backcolor | alignleft aligncenter alignright alignjustify | outdent indent | link image media insertVideo | code',
                    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                    // switch skin to oxide-dark when theme is dark (requires oxide-dark skin available)
                    skin: theme === 'dark' ? 'oxide-dark' : 'oxide',
                    content_css: theme === 'dark' ? 'dark' : 'default',
                    extended_valid_elements: 'iframe[src|frameborder|style|allowfullscreen|allow|width|height]',
                    object_resizing: true,
                    media_live_embeds: true,
                }}
            />

            <Dialog open={videoModalOpen} onOpenChange={(v) => setVideoModalOpen(Boolean(v))}    >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Inserir vídeo</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-3">
                        <label className="text-sm">URL do vídeo</label>
                        <input
                            type="text"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="input"
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input type="checkbox" checked={videoResponsive} onChange={(e) => setVideoResponsive(e.target.checked)} />
                                <span style={{ fontSize: 14 }}>Responsivo</span>
                            </label>

                            {!videoResponsive && (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <div>
                                        <label className="text-sm">Largura</label>
                                        <input value={videoWidth} onChange={(e) => setVideoWidth(e.target.value)} placeholder="560 or 50%" className="input" />
                                    </div>
                                    <div>
                                        <label className="text-sm">Altura</label>
                                        <input value={videoHeight} onChange={(e) => setVideoHeight(e.target.value)} placeholder="315" className="input" />
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    <DialogFooter className="flex justify-end gap-2 mt-4">
                        <Button onClick={() => { setVideoModalOpen(false); bookmarkRef.current = null; }}>Cancelar</Button>
                        <Button onClick={insertVideoFromModal}>Inserir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default TinyMceEditor;
