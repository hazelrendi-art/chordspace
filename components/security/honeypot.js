import { useState } from 'react';

export default function Honeypot() {
  const [trap] = useState('website');
  return (
    <input
      type="text"
      name={trap}
      value=""
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
      readOnly
    />
  );
}