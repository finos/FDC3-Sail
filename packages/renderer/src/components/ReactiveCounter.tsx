import { useState } from 'react';

const ReactiveCounter = () => {
  const [count, setCount] = useState(0);

  return (
    <button type="button" onClick={() => setCount((count) => count + 1)}>
      count is: {count}
    </button>
  );
};

export default ReactiveCounter;
