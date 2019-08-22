# Rock Paper Scissors
ETH Community Blockstars 2.0's Project 3 - Rock Paper Scissors

## Specification

A smart contract named RockPaperScissors whereby:

- Alice and Bob play the classic rock paper scissors game.
- to enrol, each player needs to deposit the right Ether amount, possibly zero.
- to play, each player submits their unique move.
- the contract decides and rewards the winner with all Ether wagered.

Stretch goals:

- make it a utility whereby any 2 people can decide to play against each other.
- reduce gas costs as much as you can.
- let players bet their previous winnings.
- how can you entice players to play, knowing that they may have their funding stuck in the contract if they faced an uncooperative player?

## How to Run the Project

1. First clone this repo

`git clone https://github.com/remedcu/RockPaperScissors.git`

2. For this and some other step, you need to have Truffle & other modules installed in your system. Enter the Remittance folder and please run:

`npm install` OR `npm i`

3. Now start the server using:

`npm run-script build && npm start`

4. Now, in your browser, open [http://127.0.0.1:8080](http://127.0.0.1:8080) or the address shown to you in your console.

**NOTE**: If you are using `ganache-cli` for blockchain, please disable MetaMask for checking this project in browser.

## How to Test the Contract

1. Please follow the step 1 - 2 of *How to Run the Project*.

2. Now start the test using:

`npm test`

## Note

- This is a prototype, please don't use it unless you know what you are doing.
- A lot can be improved in this. Feedbacks are welcome.
- Don't forget to unlock ether wallet accounts when required.

## Thank You for checking out! Star if this helped you in anyway!