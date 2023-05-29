import type {Component} from 'solid-js';

import GridMapSquarePixi from './components/GridMapSquarePixi';

const App: Component = () => {
  return (
    <div class={'container mx-auto'}>
      <header>
        <h1 class={'text-5xl font-black text-center'}>Pathfinder app</h1>
        {/*<GridMapSquare />*/}
        <GridMapSquarePixi />
      </header>
    </div>
  );
};

export default App;
