import {RiSystemExternalLinkFill} from 'solid-icons/ri';
import {JSXElement} from 'solid-js';

export default function Credits(): JSXElement {
  return <>
    <h2 class={'mb-3'}>Credits</h2>
    <div class={'grid grid-cols-2'}>
      <div><p>Author's website:</p></div>
      <div><a href={'https://stefanpetcu.com'} target={'_blank'}>
        Stefan Petcu on stefanpetcu.com
        <sup>&ensp;<RiSystemExternalLinkFill fill={'currentColor'} class={'inline'}/></sup></a></div>
      <div><p>Map tile textures:</p></div>
      <div><a href={'https://opengameart.org/users/etqws3'} target={'_blank'} rel={'noopener,nofollow'}>
        etqws3 on opengameart.org
        <sup>&ensp;<RiSystemExternalLinkFill fill={'currentColor'} class={'inline'}/></sup></a></div>
      <div><p>Animal and ghost textures:</p></div>
      <div><a href={'https://pop-shop-packs.itch.io/'} target={'_blank'} rel={'noopener,nofollow'}>
        Pop Shop Packs on itch.io
        <sup>&ensp;<RiSystemExternalLinkFill fill={'currentColor'} class={'inline'}/></sup></a></div>
      <div><p>Dust textures:</p></div>
      <div><a href={'https://nyknck.itch.io/'} target={'_blank'} rel={'noopener,nofollow'}>
        nyknck on itch.io
        <sup>&ensp;<RiSystemExternalLinkFill fill={'currentColor'} class={'inline'}/></sup></a></div>
      <div><p>A* pathfinder algorithm inspired by:</p></div>
      <div><a href={'https://briangrinstead.com/blog/astar-search-algorithm-in-javascript-updated/'}
        target={'_blank'} rel={'noopener,nofollow'}>
        Brian Grinstead
        <sup>&ensp;<RiSystemExternalLinkFill fill={'currentColor'} class={'inline'}/></sup></a></div>
    </div>
  </>;
}
