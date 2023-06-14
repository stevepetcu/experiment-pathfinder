import {format, parseISO} from 'date-fns';
import {createResource, createSignal, JSXElement, onMount} from 'solid-js';
import superagent from 'superagent';

import EnterButton from './EnterButton';
import styles from './GameWon.module.css';

interface GameWonProps {
  playerTimeToComplete: number,
  restartGameCallback: () => void,
}

interface HighScore {
  id: string | null;
  name: string;
  timeToComplete: number;
  createdAt: string;
  updatedAt: string;
}

const highScoreRow = (playerHs: HighScore, isCurrentPlayer = false): JSXElement => {
  const formattedDate = format(parseISO(playerHs.createdAt), 'dd/MMM/yyyy');
  let nameJsx: JSXElement;

  if (!isCurrentPlayer) {
    nameJsx = <p>{playerHs.name}</p>;
  } else {
    nameJsx = <input class={'rounded-none px-2'}
      value={playerHs.name} type={'text'} minlength={1} maxlength={20}/>;
  }

  return <div class={`grid grid-cols-3 divide-x divide-slate-400 gap-x-3.5 ${styles.highScoresTableRow}`}>
    <div><p>{nameJsx}</p></div>
    <div><p>{playerHs.timeToComplete}</p></div>
    <div><p>{formattedDate}</p></div>
  </div>;
};

const fetchAndSortHighScores = async (currentScore: number): Promise<{
  currentPlayerScore: HighScore,
  topTenPlayerScores: HighScore[],
}> => {
  let currentPlayerScore: HighScore = {
    id: null,
    name: 'Nameless Hero',
    timeToComplete: currentScore,
    createdAt: new Date().toDateString(),
    updatedAt: new Date().toDateString(),
  };
  let topTenPlayerScores: HighScore[] = [];
  try {
    // Save current score
    currentPlayerScore = (await superagent
      .post('http://localhost:3060/api/highscores') // TODO: extract env variable
      .send({
        name: 'Nameless Hero',
        timeToComplete: currentScore,
      })).body;

    console.log(currentPlayerScore);

    // We could be super thorough and sort these again,
    // but they're already sorted by the BFF & that's good enough for our use-case.
    topTenPlayerScores = (await superagent
      .get('http://localhost:3060/api/highscores') // TODO: extract env variable
      .query({
        limit: 10,
        offset: 0,
      })).body;
  } catch (err) {
    // TODO: implement retrying, error handling etc.
    //  Check if 4xx and 5xx HTTP codes throw errors or need to be handled differently.
    console.log(err);
  }

  return {currentPlayerScore, topTenPlayerScores};
};

const buildPlayerScoresJsx = async (currentScore: number): Promise<JSXElement> => {
  const playerHighScores = await fetchAndSortHighScores(currentScore);

  return playerHighScores.topTenPlayerScores.map(hs => {
    if (hs.id === playerHighScores.currentPlayerScore.id) {
      return highScoreRow(hs, true);
    }

    return highScoreRow(hs);
  });
};

export default function GameWon(props: GameWonProps): JSXElement {

  const [playerScoresJsx] = createResource(props.playerTimeToComplete, buildPlayerScoresJsx);
  const [isScrolledToBottom, setIsScrolledToBottom] = createSignal(false);
  let gameWonContainer: HTMLElement;

  onMount(async () => {
    setIsScrolledToBottom(
      gameWonContainer.scrollTop >= (gameWonContainer.scrollHeight - gameWonContainer.offsetHeight - 35),
    );
    gameWonContainer.addEventListener('scroll', () => {
      setIsScrolledToBottom(
        gameWonContainer.scrollTop >= (gameWonContainer.scrollHeight - gameWonContainer.offsetHeight - 35),
      );
    });

    // TODO:
    //  1. Replace with data fetching… if not in onMount, then make it not async.
    //  2. Fashion a proper placeholder, like for the Enter button.
    //  3. Once the scores are loaded, if there's a new highscore, set the focus on it.
    //     Maybe highlight the row as well or make the input blink or something. Add some padding to it and style it.
    //  4. Add functions to retrieve and save the data.
  });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return <div ref={gameWonContainer}
    class={`w-full h-full overflow-auto md:w-3/4 xl:w-1/2 px-5 py-3 m-auto 
    text-left text-slate-300 ${styles.gameWonView}
    shadow-2xl border-4 border-slate-900/20`}>
    <div class={'grid grid-cols-1 gap-y-5 divide-y-2 divide-slate-600 mt-7'}>
      <div>
        <h1>
          Congrats, you're full!
        </h1>
      </div>
      <div class={'pt-5'}>
        <h2 class={'mb-3'}>Highscores</h2>
        <div class={`grid grid-cols-3 divide-x divide-slate-400 gap-x-3.5 ${styles.highScoresTableRow}`}>
          <div class={'border-b border-slate-400 mb-2'}><p>Name</p></div>
          <div class={'border-b border-slate-400 mb-2'}><p>Time to complete</p></div>
          <div class={'border-b border-slate-400 mb-2'}><p>Date</p></div>
        </div>
        {
          playerScoresJsx.loading &&
          <p>Loading…</p>
        }
        {playerScoresJsx()}
      </div>
      <div class={'pt-5'}>
        <h2 class={'mb-3'}>Credits</h2>
        <p>Lorem ipsum dolor sit amet: <a href={'#'} target={'_blank'} rel={'noopener,nofollow'}>foo bar baz</a></p>
        <p>Lorem ipsum dolor sit amet: <a href={'#'} target={'_blank'} rel={'noopener,nofollow'}>foo bar baz</a></p>
        <p>Lorem ipsum dolor sit amet: <a href={'#'} target={'_blank'} rel={'noopener,nofollow'}>foo bar baz</a></p>
        <p>Lorem ipsum dolor sit amet: <a href={'#'} target={'_blank'} rel={'noopener,nofollow'}>foo bar baz</a></p>
        <p>Lorem ipsum dolor sit amet: <a href={'#'} target={'_blank'} rel={'noopener,nofollow'}>foo bar baz</a></p>
        <p>Lorem ipsum dolor sit amet: <a href={'#'} target={'_blank'} rel={'noopener,nofollow'}>foo bar baz</a></p>
      </div>
      <div class={'grid grid-cols-2 gap-y-5 divide-slate-400 pt-5'}>
        <div>
          <h2 class={'mt-7'}>Play again<span class={'animate-pulse-fast'}>_</span></h2>
        </div>
        <div class={'pt-5 justify-self-end'}>
          <EnterButton onClick={() => props.restartGameCallback()} isDisabled={!isScrolledToBottom()}/>
        </div>
      </div>
    </div>
  </div>;
}
