# Usage

Run 

```bash
$ pnpm install
```

to install all the frontend dependencies.

Run the same command inside the `edge-bff` or `serverless-bff` to install their dependencies.

## Available Scripts

In the project directory, you can run:

### `npm dev` or `npm start`

Runs the frontend app in the development mode.<br>
Open [http://localhost:3030](http://localhost:3030) to view it in the browser.

The page will reload if you make edits.<br>

### `npm run build`

Builds the frontend app for production to the `dist` folder.<br>
It correctly bundles Solid in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

### `npm run test`

Runs the tests for the frontend.

## Deployment

You can deploy the `dist` folder to any static host provider (netlify, surge, now, etc.)

## Running the app locally - more of a terse reminder for the author

1. Run Vercel link and link either the serverless or the edge BFF. These can be used interchangeably but the performance
of the serverless function cold start was abysmal (sometimes taking 10s - 20s), forcing the author to migrate to an edge function.
2. Run `vercel dev -l 3060` to run a BFF on the port `3060`
3. Run `npm dev` or `npm start` to run the frontend
4. Profit

> Note: Vercel can only link one project at a time, so when you run `vercel <whatever>`, you can confidently run it 
> in the root folder of the project and that goes some way towards alleviating the pain of not being able to 
> link multiple projects at the same time.

# Improvements I'd make if I had the time

Frankly, I would rewrite the project, since that would be far more efficient than refactoring. Things I'd change:
- Move all the character orchestration and interaction inside the Grid, following a mediator pattern
- Extract the PixiJS canvas into its own component and implement a pub-sub between the Grid mediator the canvas, instead
of handling events between each character on the map and between characters and the UI

The above changes would already simplify the app by an order of magnitude.

Then:
- Simplify the implementation and reduce some redundancy, like “isChangingDirection” etc.
- Probably extract a component for each screen, like losing screen, winning screen etc., to simplify the Map component
and the logic for showing those screens
- Add a debug mode
- Let players customise things, like the difficulty, for example - we can vary how many critters and ghosts they are, 
how fast they move, spawn etc. We could even make critters spawn during the game, 
and you’d have to be even faster in finding them all before the ghosts become unmanageable
- Use a containerised database for local development
- Thoroughly test the BE by using a containerised database. I would implement feature-level tests, rather than unit 
tests, for each endpoint; the utils can be unit tested.
- Test the FE: I’d implement tests at the level of each screen (e.g., win screen/lost screen/play screen etc.)
- If I consolidated the character interaction etc. using the mediator pattern, 
I could test that without relying on the UI at all.
- Use npm workspaces or whatever npm has to manage monorepos more easily
- Finally, I’ve left lots of TODOs around the code, some of which might be covered by the points above, 
some of which may not.

