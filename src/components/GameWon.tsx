import {format, fromUnixTime} from 'date-fns';
import {createSignal, JSXElement, onMount, Show} from 'solid-js';

import delay from '../utils/Delay';
import EnterButton from './EnterButton';
import styles from './GameWon.module.css';

interface GameWonProps {
  playerTimeToComplete: number,
  restartGameCallback: () => void,
}

interface PlayerScore {
  name: string | null;
  timeToComplete: number;
  timestamp: number;
}
export default function GameWon(props: GameWonProps): JSXElement {
  let gameWonContainer: HTMLElement;

  const highScores: PlayerScore[] = [
    {
      name: 'Foo',
      timeToComplete: 60,
      timestamp: Math.ceil(Date.now()/1000),
    },
    {
      name: 'Fook',
      timeToComplete: 320,
      timestamp: Math.ceil(Date.now()/1000 + 3000),
    },
    {
      name: 'Foo',
      timeToComplete: 320,
      timestamp: Math.ceil(Date.now()/1000),
    },
    {
      name: 'Foo',
      timeToComplete: 320,
      timestamp: Math.ceil(Date.now()/1000),
    },
    {
      name: 'Foo',
      timeToComplete: 120,
      timestamp: Math.ceil(Date.now()/1000),
    },
    {
      name: 'Foo',
      timeToComplete: 430,
      timestamp: Math.ceil(Date.now()/1000),
    },
    {
      name: 'Foo',
      timeToComplete: 350,
      timestamp: Math.ceil(Date.now()/1000),
    },
    {
      name: 'Foo',
      timeToComplete: 500,
      timestamp: Math.ceil(Date.now()/1000),
    },
    {
      name: 'Foo',
      timeToComplete: 220,
      timestamp: Math.ceil(Date.now()/1000),
    },
    {
      name: 'Foo',
      timeToComplete: 360,
      timestamp: Math.ceil(Date.now()/1000),
    },
  ];

  const sortedHs = highScores.sort((a, b) => {
    if (a.timeToComplete === b.timeToComplete) {
      return a.timestamp - b.timestamp;
    }

    return a.timeToComplete - b.timeToComplete;
  });

  const highScoreRow = (name: string | null, timeToComplete: number, timestamp: number): JSXElement => {
    const formattedDate = format(fromUnixTime(timestamp), 'dd/MMM/yyyy');
    let nameJsx: JSXElement;
    if (name !==  null) {
      nameJsx = <p>{name}</p>;
    } else {
      nameJsx = <input
        class="placeholder-gray-500 sm:placeholder-red-400 md:placeholder-blue-400
        lg:placeholder-green-400 xl:placeholder-orange-400"
        placeholder="Unknown"/>;
    }

    return <div class={`grid grid-cols-3 divide-x-2 divide-slate-400 gap-x-3.5 ${styles.highScoresTableRow}`}>
      <div><p>{nameJsx}</p></div>
      <div><p>{timeToComplete}</p></div>
      <div><p>{formattedDate}</p></div>
    </div>;
  };

  const [highScoresJsx, setHighScoresJsx] = createSignal<JSXElement[]>([]);

  const [isScrolledToBottom, setIsScrolledToBottom] = createSignal(false);

  onMount(async () => {
    setIsScrolledToBottom(
      gameWonContainer.scrollTop >= (gameWonContainer.scrollHeight - gameWonContainer.offsetHeight - 35),
    );
    gameWonContainer.addEventListener('scroll', () => {
      setIsScrolledToBottom(
        gameWonContainer.scrollTop >= (gameWonContainer.scrollHeight - gameWonContainer.offsetHeight - 35),
      );
    });

    const playerScoreIndex = highScores.findIndex(hs => hs.timeToComplete >= props.playerTimeToComplete);
    if (playerScoreIndex > -1) {
      highScores[playerScoreIndex] = {
        name: null,
        timeToComplete: props.playerTimeToComplete,
        timestamp: Math.ceil(Date.now()/1000),
      };
    }

    // TODO:
    //  1. Replace with data fetching… if not in onMount, then make it not async.
    //  2. Fashion a proper placeholder, like for the Enter button.
    //  3. Once the scores are loaded, if there's a new highscore, set the focus on it.
    //     Maybe highlight the row as well or make the input blink or something. Add some padding to it and style it.
    //  4. Add functions to retrieve and save the data.
    await delay(2000);

    setHighScoresJsx(sortedHs.map(hs => highScoreRow(
      hs.name,
      hs.timeToComplete,
      hs.timestamp,
    )));
  });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return <div ref={gameWonContainer}
    class={`w-full h-full overflow-auto md:w-3/4 xl:w-1/2 p-3 m-auto text-left text-slate-400 ${styles.gameWonView}`}>
    <h1>
      Congrats, you're full!
    </h1>
    <div class={'grid grid-cols-1 gap-y-7 divide-y-4 divide-slate-400 mt-7'}>
      <div>
        <h2 class={'mb-3'}>Highscores</h2>
        <div class={`grid grid-cols-3 divide-x-2 divide-slate-400 gap-x-3.5 ${styles.highScoresTableRow}`}>
          <div><p>Name</p></div>
          <div><p>Time to complete</p></div>
          <div><p>Date</p></div>
        </div>
        <Show when={highScoresJsx().length > 0} fallback={'Loading…'}>
          {highScoresJsx()}
        </Show>
      </div>
      <div class={'pt-7'}>
        <h2 class={'mb-3'}>Credits</h2>
        <p>Lorem ipsum dolor sit amet: <a href={'#'} target={'_blank'} rel={'noopener,nofollow'}>foo bar baz</a></p>
        <p>Lorem ipsum dolor sit amet: <a href={'#'} target={'_blank'} rel={'noopener,nofollow'}>foo bar baz</a></p>
        <p>Lorem ipsum dolor sit amet: <a href={'#'} target={'_blank'} rel={'noopener,nofollow'}>foo bar baz</a></p>
        <p>Lorem ipsum dolor sit amet: <a href={'#'} target={'_blank'} rel={'noopener,nofollow'}>foo bar baz</a></p>
        <p>Lorem ipsum dolor sit amet: <a href={'#'} target={'_blank'} rel={'noopener,nofollow'}>foo bar baz</a></p>
        <p>Lorem ipsum dolor sit amet: <a href={'#'} target={'_blank'} rel={'noopener,nofollow'}>foo bar baz</a></p>
      </div>
    </div>
    <div class={'grid grid-cols-2 gap-y-7 divide-y-4 divide-slate-400 mt-7'}>
      <h2 class={'mt-7'}>Play again<span class={'animate-pulse-fast'}>_</span></h2>
      <EnterButton onClick={() => props.restartGameCallback()} isDisabled={!isScrolledToBottom()}/>
    </div>
  </div>;
}
