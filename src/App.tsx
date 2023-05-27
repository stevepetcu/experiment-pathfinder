import type { Component } from 'solid-js';

import GridMapSquare from './components/GridMapSquare';

const App: Component = () => {
  return (
    <div class={'container mx-auto'}>
      <header>
        <h1 class={'text-5xl font-black text-center'}>Pathfinder app</h1>
        <GridMapSquare />
      </header>
    </div>
  );
};

export default App;
