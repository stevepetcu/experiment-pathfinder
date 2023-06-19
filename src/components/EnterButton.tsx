import {IoReturnDownBackSharp} from 'solid-icons/io';
import { JSXElement} from 'solid-js';


interface EnterButtonProps {
  onClick: () => void;
  isDisabled: boolean
}

export default function EnterButton(props: EnterButtonProps): JSXElement {
  return <button disabled={props.isDisabled}
    class="disabled:cursor-wait disabled:bg-slate-300 px-2 sm:px-4
          bg-slate-200 hover:bg-white text-slate-700 font-semibold
          inline m-auto w-20 h-10 sm:w-32 sm:h-16
          text-base sm:text-xl md:text-2xl
          border border-r-slate-100 border-t-slate-100 border-b-slate-400 border-l-slate-400 rounded-md
          active:scale-[0.97]"
    style={
      '-webkit-box-shadow: inset 7px -15px 25px 0px rgba(255, 255, 255, 1), ' +
                   'inset -3px 7px 20px 5px rgba(2,6,3,0.25), 0px 0px 10px 5px rgba(2,6,3,0.35); ' +
                   '-moz-box-shadow: inset 7px -15px 25px 0px rgba(255, 255, 255, 1), ' +
                   'inset -3px 7px 20px 5px rgba(2,6,3,0.25), 0px 0px 10px 5px rgba(2,6,3,0.35); ' +
                   'box-shadow: inset 7px -15px 25px 0px rgba(255, 255, 255, 1), ' +
                   'inset -3px 7px 20px 5px rgba(2,6,3,0.25), 0px 0px 10px 5px rgba(2,6,3,0.35); '
    }
    onClick={() => props.onClick()}>
    <span class="grid grid-cols-3 gap-x-2 sm:gap-x-3 animate-pulse-fast"
      classList={{
        'hidden': !props.isDisabled,
        'block': props.isDisabled,
      }}>
      <span class="h-2 bg-slate-700 col-span-2" />
      <span class="h-2 bg-slate-700 col-span-1" />
    </span>
    <span classList={{
      'hidden': props.isDisabled,
      'inline': !props.isDisabled,
    }}>
      Enter <IoReturnDownBackSharp fill={'currentColor'} class={'inline'} />
    </span>
  </button>;
}
