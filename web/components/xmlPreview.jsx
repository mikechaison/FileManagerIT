import React, { useState, useEffect } from 'react';
import { Spinner, Alert } from 'react-bootstrap';
import { Highlight, themes } from 'prism-react-renderer';

export default function XmlPreview({file, onPreviewLoaded, onPreviewError}) {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        setContent('');

        const fetchXmlContent = async () => {
            try {
                const response = await fetch(file.url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch file: ${response.statusText}`);
                }
                const text = await response.text();
                setContent(text);

                if (onPreviewLoaded) {
                    onPreviewLoaded();
                }

            } catch (err) {
                setError(err.message);
                if (onPreviewError) {
                    onPreviewError();
                }
            } finally {
                setLoading(false);
            }
        };

        fetchXmlContent();
        
    }, [file.url, onPreviewLoaded, onPreviewError]);

    if (loading) {
        return null; 
    }

    if (error) {
        return <Alert variant="danger">Could not load preview: {error}</Alert>;
    }

    return (
        <Highlight
            theme={themes.github}
            code={content}                
            language="xml"                
        >
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre 
                    className={className} 
                    style={{
                        ...style,
                        maxHeight: '600px',
                        overflow: 'auto',
                        borderRadius: '5px',
                        border: '1px solid #ddd',
                        padding: '10px',
                        fontSize: '0.9em',
                    }}
                >
                    {tokens.map((line, i) => (
                        <div key={i} {...getLineProps({ line })}>
                            <span style={{
                                display: 'inline-block',
                                width: '2em',
                                marginRight: '1em',
                                opacity: 0.5,
                                userSelect: 'none'
                            }}>
                                {i + 1}
                            </span>
                            {line.map((token, key) => (
                                <span key={key} {...getTokenProps({ token })} />
                            ))}
                        </div>
                    ))}
                </pre>
            )}
        </Highlight>
    );
};