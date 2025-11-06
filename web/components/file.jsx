import React from 'react'

export default function File({file, onSelect}) {
  const handleClick = (e) => {
    e.preventDefault();
    onSelect(file);
  };

  return (
    <a 
      href={file.url}
      onClick={handleClick}
      className="link-offset-2 link-underline link-underline-opacity-0"
      style={{ cursor: 'pointer' }}
    >
      {file.name}
    </a>
  );
}
