import {createSignal, For, JSXElement, Show} from 'solid-js';

import {CharacterBuff} from '../models/CharacterBuff';

interface BuffDisplayProps {
  buffs: CharacterBuff[]
}

export default function BuffsDisplay(props: BuffDisplayProps): JSXElement {
  const [showBuffTooltip, setShowBuffTooltip] = createSignal(false);
  return <Show when={props.buffs.length > 0}>
    <p class={'text-xl sm:text-2xl md:text-3xl font-bold leading-9 text-white'}
      style={{'text-shadow':'-2px 0px 0px rgba(2, 6, 23, 0.55), 0px -2px 0px rgba(2, 6, 23, 1)'}}>
      Buffs:
    </p>
    <For each={props.buffs}>{(buff) =>
      <>
        <img onClick={() => setShowBuffTooltip(!showBuffTooltip())}
          src={buff.spriteImage} alt={buff.description} class={'w-6 h-6 cursor-pointer'}/>
        {buff.stacks > 1 &&
        <p class={'text-xl sm:text-3xl md:text-4xl leading-9 text-white'}
          style={{'text-shadow':'-2px 0px 0px rgba(2, 6, 23, 0.55), 0px -2px 0px rgba(2, 6, 23, 1)'}}>
          x {buff.stacks}</p>
        }
      </>
    }</For>
    <For each={props.buffs}>{(buff) =>
      <div classList={{
        'block': showBuffTooltip(),
        'hidden': !showBuffTooltip(),
      }}>
        <p class={'text-sm sm:text-base md:text-lg leading-none text-white'}
          style={{'text-shadow':'-2px 0px 0px rgba(2, 6, 23, 0.55), 0px -2px 0px rgba(2, 6, 23, 1)'}}>
          {buff.name}: {buff.description}</p>
      </div>
    }</For>
  </Show>;
}
