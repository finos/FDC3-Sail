import React, { useState, useMemo } from 'react';

const ReactiveHash = () => {
  const [rawString, setRawString] = useState('Hello World');

  const hashedString = useMemo(() => {
    return window.nodeCrypto.sha256sum(rawString);
  }, [rawString]);

  return (
    <>
      <div>
        <label>
          Raw value:{' '}
          <input type="text" value={rawString} onChange={event => setRawString(event.target.value)} />
        </label>
      </div>
      <div>
        <label>
          Hashed by nodeCrypto:{' '}
          <input type="text" value={hashedString} readOnly={true} />
        </label>
      </div>
    </>
  );
};

export default ReactiveHash;
