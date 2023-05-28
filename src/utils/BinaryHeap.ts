export interface BinaryHeap<T> {
  heap: T[];
  scoreFn: (element: T) => number;
  push: (element: T) => BinaryHeap<T>;
  pop: () => T;
  size: () => number;
  rescore: (element: T) => BinaryHeap<T>;
}

export default function binaryHeap<T>(scoreFn: BinaryHeap<T>['scoreFn']): BinaryHeap<T> {
  const heap: T[] = [];
  const push = (element: T) => {
    // Add the new element to the end of the array.
    _this.heap.push(element);

    // Allow it to sink down.
    sinkDown(_this.heap.length - 1);

    return _this;
  };

  const pop = () => {
    // Store the first element, so we can return it later.
    const result = _this.heap[0];
    // Get the element at the end of the array.
    const end = _this.heap.pop();
    // If there are any elements left, put the end element at the start, and let it bubble up.
    if (_this.heap.length > 0 && end !== undefined) {
      _this.heap[0] = end;
      bubbleUp(0);
    }
    return result;
  };

  const size = () => {
    return _this.heap.length;
  };

  const rescore = (element: T) => {
    sinkDown(_this.heap.indexOf(element));

    return _this;
  };

  const sinkDown = (index: number) => {
    // Fetch the element that has to be sunk.
    const element = _this.heap[index];

    // When at 0, an element can not sink any further.
    while (index > 0) {
      // Compute the parent element's index, and fetch it.
      const parentIndex = ((index + 1) >> 1) - 1;
      const parent = _this.heap[parentIndex];
      // Swap the elements if the parent is greater.
      if (_this.scoreFn(element) < _this.scoreFn(parent)) {
        _this.heap[parentIndex] = element;
        _this.heap[index] = parent;
        // Update 'index' to continue at the new position.
        index = parentIndex;
      }
      // Found a parent that is less, no need to sink any further.
      else {
        break;
      }
    }

    return _this;
  };

  const bubbleUp = (index: number) => {
    // Look up the target element and its score.
    const length = _this.heap.length;
    const element = _this.heap[index];
    const elementScore = _this.scoreFn(element);

    while (true) {
      // Compute the indexes of the child elements.
      const child2N = (index + 1) << 1, child1N = child2N - 1;
      // This is used to store the new position of the element, if any.
      let swap = null;
      let child1Score;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        const child1 = _this.heap[child1N];
        child1Score = _this.scoreFn(child1);

        // If the score is less than our element's, we need to swap.
        if (child1Score < elementScore) {
          swap = child1N;
        }
      }

      // Do the same checks for the other child.
      if (child2N < length) {
        const child2 = _this.heap[child2N];
        const child2Score = _this.scoreFn(child2);

        const scoreToCompare = swap !== null && child1Score ? child1Score : elementScore;

        if (child2Score < scoreToCompare) {
          swap = child2N;
        }

        // if (child2Score < (swap === null ? elementScore : child1Score)) {
        //   swap = child2N;
        // }
      }

      // If the element needs to be moved, swap it, and continue.
      if (swap !== null) {
        _this.heap[index] = _this.heap[swap];
        _this.heap[swap] = element;
        index = swap;
      } else {
        // Otherwise, we are done.
        break;
      }
    }

    return _this;
  };

  const _this = {
    heap,
    scoreFn,
    push,
    pop,
    size,
    rescore,
  };

  return _this;
}
