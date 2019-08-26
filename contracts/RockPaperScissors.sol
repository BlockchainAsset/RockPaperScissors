pragma solidity >=0.4.22 <0.6.0;

import "./Stoppable.sol";
import "./SafeMath.sol";

contract RockPaperScissors is Stoppable{
    using SafeMath for uint;

    struct PlayDetails {
        uint256 wager; // For storing the wager in that particular play
        uint256 deadline; // Each player has this much time till claimBack/Play
        address playerOne; // To store the player One's Address
        address playerTwo; // To store the player Two's Address
        uint256 playerTwoChoice; // To store player Two's game
    }

    uint256 public maxGamePlayTime; // Maximum amount of time for a game play from current time
    uint256 public resultTime; // Maximum amount of time for player 1 to reveal the result after which player 2 wins automatically

    mapping (address => uint256) public balances; // For storing the player balance in contract
    mapping (bytes32 => PlayDetails) public plays;

    event Deposit(address indexed playerAddress, uint256 value);
    event PlayerOne(bytes32 indexed hashValue, address indexed playerAddress, uint256 bet, uint256 deadline);
    event PlayerTwo(bytes32 indexed hashValue, address indexed playerAddress, uint256 indexed choice);
    event Withdrawed(address indexed to, uint256 value);
    event Reveal(bytes32 indexed hashValue, address indexed winnerAddress, address indexed revealAddress, uint256 choice);
    event ForceReveal(bytes32 indexed hashValue, address indexed winnerAddress);

    constructor(bool initialRunState) public Stoppable(initialRunState){
        maxGamePlayTime = 3600; // Set at 1 hour
        resultTime = 1200; // Set at 20 min
    }

    function encrypt(uint256 choice, bytes32 uniqueWord) public view returns(bytes32 hashValue){

        // 1 is Rock, 2 is Paper and 3 is Scissor
        require(choice > 0 && choice < 4, "Invalid Choice Passed");
        return keccak256(abi.encodePacked(choice, uniqueWord, address(this), msg.sender));

    }

    function playerOne(bytes32 hashValue, uint256 bet, uint256 duration, address playerTwoAddress) public onlyIfRunning payable returns(bool status){

        uint userBalance = balances[msg.sender];

        // Even though we are going a long way to make sure the hashValue will be unique
        require(plays[hashValue].playerOne == address(0), "Please choose another Unique Word");

        // This is just a particular amount of time set at the time of contract deployment
        require(duration <= maxGamePlayTime, "Each play is restricted to be max of a particular amount of time");

        require(bet > 0, "Atleast 1 wei bet is required");

        require(bet <= userBalance.add(msg.value), "Bet amount higher than balance");

        balances[msg.sender] = userBalance.add(msg.value).sub(bet);
        if(msg.value > 0){
            emit Deposit(msg.sender, msg.value);
        }

        uint256 deadline = now.add(duration);

        // Play Details are added
        plays[hashValue].wager = bet;
        plays[hashValue].deadline = deadline;
        plays[hashValue].playerOne = msg.sender;
        plays[hashValue].playerTwo = playerTwoAddress;

        emit PlayerOne(hashValue, msg.sender, bet, deadline);
        return true;

    }

    function playerTwo(bytes32 hashValue, uint256 choice) public onlyIfRunning payable returns(bool status){

        require(choice > 0 && choice < 4, "Invalid Choice Passed");

        require(plays[hashValue].playerTwo == msg.sender, "Only that particular player can play this bet");

        uint256 userBalance = balances[msg.sender];
        uint256 betAmount = plays[hashValue].wager;
        uint256 deadline = plays[hashValue].deadline;

        require(deadline <= now, "Play Deadline has passed");

        if(msg.value > 0){
            // If extra amount is sent with this transaction, to get that.
            balances[msg.sender] = userBalance.add(msg.value);
            emit Deposit(msg.sender, msg.value);
        }

        require(userBalance >= betAmount, "The player don't have enough balance");

        // This will also take care if betAmount specified was more than balance of that player
        balances[msg.sender] = userBalance.sub(betAmount);

        // Play Details are added
        plays[hashValue].deadline = now.add(resultTime);
        plays[hashValue].playerTwoChoice = choice;

        emit PlayerTwo(hashValue, msg.sender, choice);
        return true;

    }

    function reveal(uint choice, bytes32 uniqueWord) public onlyIfRunning returns(bool status){

        bytes32 hashValue = encrypt(choice, uniqueWord);

        // To make sure player 2 has played
        require(plays[hashValue].playerTwoChoice != 0, "Player 2 has not played yet");

        address playerTwoAddress = plays[hashValue].playerTwo;
        uint256 playerTwoChoice = plays[hashValue].playerTwoChoice;

        uint256 individualWager = plays[hashValue].wager;
        uint256 betAmount = individualWager.mul(2);
        plays[hashValue].wager = 0;

        if(choice == playerTwoChoice){
            uint256 playerOneBalance = balances[msg.sender];
            uint256 playerTwoBalance = balances[playerTwoAddress];
            balances[msg.sender] = playerOneBalance.add(individualWager);
            balances[playerTwoAddress] = playerTwoBalance.add(individualWager);
            emit Reveal(hashValue, msg.sender, choice);
        }
        else{
            address won;
            uint256 playerBalance;
            if((choice == 1 && playerTwoChoice == 2) || (choice == 2 && playerTwoChoice == 3) || (choice == 3 && playerTwoChoice == 1)){
                uint256 playerTwoBalance = balances[playerTwoAddress];
                won = playerTwoAddress;
                playerBalance = playerTwoBalance;
            }
            else{
                uint256 playerOneBalance = balances[msg.sender];
                won = msg.sender;
                playerBalance = playerOneBalance;
            }

            balances[won] = playerBalance.add(betAmount);

            emit Reveal(hashValue, won, msg.sender, choice);
        }

        // Cleaning up
        plays[hashValue].playerTwo = address(0);
        plays[hashValue].playerTwoChoice = 0;
        plays[hashValue].deadline = 0;

        return true;
    }

    function forceReveal(bytes32 hashValue) public onlyIfRunning returns(bool status){

        uint256 wager = plays[hashValue].wager;

        // Only the Remit Creator should be allowed to claim back
        require(plays[hashValue].playerTwo == msg.sender, "Only second player can use this function");
        require(wager != 0, "Play Ended");
        require(plays[hashValue].deadline > now, "Force Reveal period has not started yet");

        plays[hashValue].wager = 0;
        balances[msg.sender] = balances[msg.sender].add(wager.mul(2));

        // Cleaning up
        plays[hashValue].playerTwo = address(0);
        plays[hashValue].playerTwoChoice = 0;
        plays[hashValue].deadline = 0;

        emit ForceReveal(hashValue, msg.sender);

        return true;
    }

    function withdraw(uint256 amount) public onlyIfRunning returns(bool status){

        require(amount > 0, "Zero cant be withdrawn");

        balances[msg.sender] = balances[msg.sender].sub(amount);

        emit Withdrawed(msg.sender, amount);

        msg.sender.transfer(amount);
        return true;

    }

}
