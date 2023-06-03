import type {Component} from 'solid-js';

import GridMapSquarePixi from './components/GridMapSquarePixi';

const App: Component = () => {
  return (
    <div id='my-app' class={'container mx-0 font-amatic'}>
      <GridMapSquarePixi />
    </div>
  );
};

export default App;
