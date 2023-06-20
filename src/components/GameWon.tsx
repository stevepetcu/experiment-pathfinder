import {format, parseISO} from 'date-fns';
import ky from 'ky';
import {BiRegularSave} from 'solid-icons/bi';
import {createEffect, createResource, JSXElement} from 'solid-js';

import {formatSeconds} from '../utils/Time';
import EnterButton from './EnterButton';
import styles from './GameWon.module.css';
import {logError} from '../utils/Console';

interface GameWonProps {
  playerTimeToComplete: number,
  restartGameCallback: () => void,
}

interface HighScore {
  // TODO: It would be nice to share the types (this _is_ a monorepo), or try tRPC.
  id?: string;
  publicId: string | null;
  name: string;
  timeToComplete: number;
  createdAt: string;
  updatedAt: string;
}

const savePlayerName = async (
  playerHighScore: HighScore,
  inputRef: HTMLInputElement,
  btnRef: HTMLButtonElement,
): Promise<HighScore> => {
  let updatedPlayerScore: HighScore = playerHighScore;
  if (!updatedPlayerScore.id) {
    // We only want to allow updating the currentPlayer,
    // and that's the only object that'll have the id key set.
    return updatedPlayerScore;
  }

  const name = inputRef.value.trim();

  inputRef.disabled = true;
  btnRef.disabled = true;
  btnRef.classList.add('animate-pulse-fast');

  let isConfirmedRetrySaveName = false;

  try {
    // Save current score
    updatedPlayerScore = await ky
      .patch(`${import.meta.env.VITE_BFF_DOMAIN}/api/highscores/${playerHighScore.id}`, {
        body: JSON.stringify({name}),
        timeout: import.meta.env.VITE_BFF_TIMEOUT_RESPONSE,
        retry: {
          limit: 4,
          methods: ['patch'],
        },
      })
      .json();
  } catch (err) {
    // TODO: add a nice modal here.
    isConfirmedRetrySaveName = confirm('We were attacked by goblins and might have lost your name. 😥\n\n' +
      'Your score is already saved anonymously and your name might have even been saved. ' +
      'We just couldn\'t confirm that.\n\n' +
      'Would you like to try adding your name again?');
  }

  if (isConfirmedRetrySaveName) {
    inputRef.disabled = false;
    btnRef.disabled = false;
    btnRef.classList.remove('animate-pulse-fast');
  } else {
    // I am sorry for this atrocity.
    const contentReplacement = document.createElement('p');
    contentReplacement.appendChild(document.createTextNode(name));
    (inputRef.parentElement?.parentElement as unknown as HTMLDivElement).replaceWith(contentReplacement);
  }

  return updatedPlayerScore;
};

const handleUserInput = (
  event: KeyboardEvent,
  playerHs: HighScore,
  inputRef: HTMLInputElement,
  btnRef: HTMLButtonElement,
) => {
  const inputValue = inputRef.value.trim();
  btnRef.disabled = inputValue === '' || inputValue === 'Nameless Hero';

  if (!btnRef.disabled && event.key === 'Enter') {
    savePlayerName(playerHs, inputRef, btnRef);
    event.preventDefault();
  }
};

const highScoreRow = (index: number, playerHs: HighScore, isCurrentPlayer = false): JSXElement => {
  // TODO: ensure that the dates are converted to the local timezone?
  //  console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const formattedDate = format(parseISO(playerHs.createdAt), 'dd/MMM/yyyy');
  let nameJsx: JSXElement;
  let inputRef: HTMLInputElement;
  let btnRef: HTMLButtonElement;

  if (!isCurrentPlayer) {
    nameJsx = <p>{playerHs.name}</p>;
  } else {
    nameJsx = <div class={'flex gap-x-3.5 items-center'}>
      <div class={'w-48'}>
        <input ref={inputRef}
          onKeyUp={(event) => handleUserInput(
            event,
            playerHs,
            inputRef,
            btnRef,
          )}
          id={'current-player-hs-name-input'}
          class={'rounded-none px-2 w-full text-slate-900'}
          placeholder={playerHs.name} type={'text'}
          minlength={1} maxlength={20}/>
      </div>
      <div class={'flex-grow text-center'}>
        <button ref={btnRef}
          disabled={true}
          onClick={() => savePlayerName(playerHs, inputRef, btnRef)}
          class={'hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed'}>
          <BiRegularSave fill={'currentColor'} class={'inline text-3xl'}/>
        </button>
      </div>
    </div>;
  }

  return <div class={`grid grid-cols-12 divide-x divide-slate-400 gap-x-3.5 ${styles.highScoresTableRow}`}>
    <div class={'border-b border-slate-400 mb-1 pb-1 col-span-1 text-white'}><p>{index}</p></div>
    <div class={'border-b border-slate-400 mb-1 pb-1 col-span-5'}>{nameJsx}</div>
    <div class={'border-b border-slate-400 mb-1 pb-1 col-span-3'}><p>{formatSeconds(playerHs.timeToComplete)}</p></div>
    <div class={'border-b border-slate-400 mb-1 pb-1 col-span-3'}><p>{formattedDate}</p></div>
  </div>;
};

const fetchAndSortHighScores = async (currentScore: number): Promise<{
  currentPlayerScore: HighScore,
  topTenPlayerScores: HighScore[],
}> => {
  let currentPlayerScore: HighScore = {
    publicId: 'current-player',
    name: 'Nameless Hero',
    timeToComplete: currentScore,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  // Reset the id so that, if the requests fail, we don't ask the player to enter their name:
  let topTenPlayerScores: HighScore[] = [{...currentPlayerScore, publicId: '-'}];

  try {
    // Save current score
    currentPlayerScore = await ky
      .post(`${import.meta.env.VITE_BFF_DOMAIN}/api/highscores`, {
        body: JSON.stringify({
          name: 'Nameless Hero',
          timeToComplete: currentScore,
        }),
        timeout: import.meta.env.VITE_BFF_TIMEOUT_RESPONSE,
      })
      .json();

    // We could be super thorough and sort these again,
    // but they're already sorted by the BFF & that's good enough for our use-case.
    const searchParams = new URLSearchParams();
    searchParams.set('limit', '10');
    searchParams.set('offset', '0');
    topTenPlayerScores = await ky
      .get(`${import.meta.env.VITE_BFF_DOMAIN}/api/highscores`, {
        searchParams,
        timeout: import.meta.env.VITE_BFF_TIMEOUT_RESPONSE,
        retry: {
          limit: 4,
          methods: ['get'],
        },
      })
      .json();
  } catch (err) {
    // Do nothing; we could easily implement a retry button if we had time.
    // For now, we'll simply return the current player's score, and we won't save it.
    // TODO: add a nice retry button.
    logError(err);
  }

  return {currentPlayerScore, topTenPlayerScores};
};

const processPlayerScore = async (currentScore: number):
  Promise<{ hsJsx: JSXElement, isPlayerTopTen: boolean | null }> => {
  const playerHighScores = await fetchAndSortHighScores(currentScore);
  let isPlayerTopTen = playerHighScores.topTenPlayerScores.length > 1 ? false : null;

  const hsJsx = playerHighScores.topTenPlayerScores.map((hs, index) => {
    if (hs.publicId === playerHighScores.currentPlayerScore.publicId) {
      isPlayerTopTen = true;
      // Pass the actual current player object, containing the id we use in the backend.
      // This should prevent accessing other player's real ids, though it doesn't prevent anyone from seeing their own.
      // Even so the PATCH API only allows changing your name, not your score.
      return highScoreRow(index + 1, playerHighScores.currentPlayerScore, true);
    }

    return highScoreRow(index + 1, hs);
  });

  return {hsJsx, isPlayerTopTen};
};

export default function GameWon(props: GameWonProps): JSXElement {

  const [playerScoresJsx] = createResource(props.playerTimeToComplete, processPlayerScore);

  createEffect(() => {
    let currentPlayerHsNameInput: HTMLElement | null = null;
    if (playerScoresJsx.state === 'ready') {
      currentPlayerHsNameInput = document.getElementById('current-player-hs-name-input');

      if (currentPlayerHsNameInput) {
        setTimeout(() => currentPlayerHsNameInput?.focus(), 100);
      }
    }
  });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return <div class={`w-full h-full overflow-auto md:w-3/4 xl:w-1/2 px-5 py-3 m-auto 
    text-left text-slate-300 ${styles.gameWonView}
    shadow-2xl border-4 border-slate-900/20`}>
    <div class={'grid grid-cols-1 gap-y-5 divide-y-2 divide-slate-600 mt-7'}>
      <div class={'flex flex-col lg:flex-row gap-x-2 align-bottom'}>
        <h1>
          Congrats, you're full!
        </h1>
      </div>
      <div class={'pt-5'}>
        <div class={'mb-4'}>
          <h2>
            Highscores
          </h2>
          {
            playerScoresJsx.state === 'ready' && playerScoresJsx().isPlayerTopTen === true &&
            <p class={'text-sm'}>
              You placed in the top ten! Enter your name below.
            </p>
          }
          {
            playerScoresJsx.state === 'ready' && playerScoresJsx().isPlayerTopTen === false &&
            <p class={'text-sm'}>
              You didn't place in the top ten. Try, try again!
            </p>
          }
        </div>
        <div class={`grid grid-cols-12 divide-x divide-slate-400 gap-x-3.5 ${styles.highScoresTableRow}`}>
          <div class={'border-b border-slate-400 mb-1 pb-1 col-span-1 text-white'}><p>Rank</p></div>
          <div class={'border-b border-slate-400 mb-1 pb-1 col-span-5 text-white'}><p>Name</p></div>
          <div class={'border-b border-slate-400 mb-1 pb-1 col-span-3 text-white'}><p>Time</p></div>
          <div class={'border-b border-slate-400 mb-1 pb-1 col-span-3 text-white'}><p>Date</p></div>
        </div>
        {
          playerScoresJsx.loading &&
          <p class={'animate-pulse-fast'}>Loading…</p>
        }
        {
          !playerScoresJsx.loading && playerScoresJsx.state === 'ready' &&
          playerScoresJsx().hsJsx
        }
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
        <div class={'flex'}>
          <h2 class={'place-self-end'}>Play again<span class={'animate-pulse-fast'}>_</span></h2>
        </div>
        <div class={'pt-5 justify-self-end'}>
          <EnterButton onClick={() => props.restartGameCallback()} isDisabled={false} />
        </div>
      </div>
    </div>
  </div>;
}
