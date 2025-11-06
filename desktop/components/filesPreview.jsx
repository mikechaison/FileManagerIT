import React from 'react'

export default function File({file}) {
  return (
    <a href={file.url} target="_blank">
        {file.name}
    </a>
  )
}