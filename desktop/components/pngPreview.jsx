import React from 'react'

export default function PngPreview({file, onPreviewLoaded, onPreviewError}) {
  return (
    <img 
        src={file.url} 
        className="img-fluid"
        onLoad={onPreviewLoaded}
        onError={onPreviewError}
    />
  )
}