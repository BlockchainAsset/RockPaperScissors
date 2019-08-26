pragma solidity >=0.4.22 <0.6.0;

import "./Stoppable.sol";
import "./SafeMath.sol";

contract RockPaperScissors is Stoppable{
    using SafeMath for uint;

    struct UserDetails {
        uint256 balance; // For storing the player balance in contract
        uint256 lastBet; // For storing the player's last bet value
    }

    struct PlayDetails {
        uint256 bet; // For storing the wager in that particular play
        uint256 deadline; // Each player has this much time till claimBack/Play
        address playerOne; // To store the player One's Address
        address playerTwo; // To store the player Two's Address
        uint256 playerTwoChoice; // To store player Two's game
    }

    uint256 public maxGamePlayTime; // Maximum amount of time for a game play from current time
    uint256 public resultTime; // Maximum amount of time for player 1 to reveal the result after which player 2 wins automatically

    mapping (address => UserDetails) public users;
    mapping (bytes32 => PlayDetails) public plays;

    event Deposit(address indexed playerAddress, uint256 value);
    event PlayerOne(bytes32 indexed hashValue, address playerAddress, uint256 indexed bet, uint256 indexed deadline);
    event PlayerTwo(bytes32 indexed hashValue, address indexed playerAddress, uint256 indexed choice);
    event Withdrawed(address indexed to, uint256 value);
    event Reveal(bytes32 indexed hashValue, address indexed playerAddress, uint256 indexed choice);
    event ForceReveal(bytes32 indexed hashValue, address indexed playerAddress);

    constructor(bool initialRunState) public Stoppable(initialRunState){
        maxGamePlayTime = 3600; // Set at 1 hour
        resultTime = 1200; // Set at 20 min
    }

    function encrypt(uint256 choice, bytes32 uniqueWord) public view returns(bytes32 hashValue){

        // 1 is Rock, 2 is Paper and 3 is Scissor
        require(choice > 0 && choice < 4, "Invalid Choice Passed");
        return keccak256(abi.encodePacked(choice, uniqueWord, address(this), msg.sender));

    }

    function deposit() public onlyIfRunning payable returns(bool status){

        // To decrease the gas used
        uint msgValue = msg.value;
        address msgSender = msg.sender;

        // Minimum 1 wei should be sent.
        require(msgValue > 0, "Amount should be atleast 1 wei");

        // If the player is new, his lastBet will be 0, which is updated to minimum 1 wei
        if (users[msgSender].lastBet == 0){
            users[msgSender].lastBet = 1;
        }

        // Details of Player is updated
        users[msgSender].balance = msgValue;

        emit Deposit(msgSender, msgValue);

        return true;

    }

    function playerOne(bytes32 hashValue, uint256 bet, uint256 second) public onlyIfRunning returns(bool status){

        address msgSender = msg.sender;
        uint userBalance = users[msgSender].balance;

        // Even though we are going a long way to make sure the hashValue will be unique
        require(plays[hashValue].playerOne == address(0), "Please choose another Unique Word");

        // This is just a particular amount of time set at the time of contract deployment
        require(second < maxGamePlayTime, "Each play is restricted to be max of a particular amount of time");

        uint256 betAmount = bet;

        // If the user wants to play with his last bet, he will pass zero to this function
        if(betAmount == 0){
            betAmount == users[msgSender].lastBet;
        }

        // This will also take care if betAmount specified was more than balance of that player
        users[msgSender].balance = userBalance.sub(betAmount);
        users[msgSender].lastBet = betAmount;

        uint256 deadline = now.add(second);

        // Play Details are added
        plays[hashValue].bet = betAmount;
        plays[hashValue].deadline = deadline;
        plays[hashValue].playerOne = msgSender;

        emit PlayerOne(hashValue, msgSender, betAmount, deadline);
        return true;

    }

    function playerTwo(bytes32 hashValue, uint256 choice) public onlyIfRunning returns(bool status){

        require(choice > 0 && choice < 4, "Invalid Choice Passed");

        address msgSender = msg.sender;
        uint256 userBalance = users[msgSender].balance;
        uint256 betAmount = plays[hashValue].bet;
        uint256 deadline = plays[hashValue].deadline;

        require(deadline <= now, "Play Deadline has passed");
        require(userBalance >= betAmount, "The player don't have enough balance");
        require(plays[hashValue].playerTwoChoice == 0, "Some other player already used this hash");

        // This will also take care if betAmount specified was more than balance of that player
        users[msgSender].balance = userBalance.sub(betAmount);
        users[msgSender].lastBet = betAmount;

        // Play Details are added
        plays[hashValue].bet = betAmount.mul(2);
        plays[hashValue].deadline = now.add(resultTime);
        plays[hashValue].playerTwo = msgSender;
        plays[hashValue].playerTwoChoice = choice;

        emit PlayerTwo(hashValue, msgSender, choice);
        return true;

    }

    function reveal(uint choice, bytes32 uniqueWord) public onlyIfRunning returns(bool status){

        bytes32 hashValue = encrypt(choice, uniqueWord);
        address msgSender = msg.sender;

        // Only the first player should be allowed to use this function
        require(plays[hashValue].playerOne == msgSender, "Only first player can use this function");
        require(plays[hashValue].bet != 0, "Play Ended");

        address won = address(0);
        address playerTwoAddress = plays[hashValue].playerTwo;
        uint256 playerTwoChoice = plays[hashValue].playerTwoChoice;

        uint256 playerOneBalance = users[msgSender].balance;
        uint256 playerTwoBalance = users[playerTwoAddress].balance;
        uint256 playerBalance = 0;

        uint256 betAmount = plays[hashValue].bet;
        uint256 betAmountByTwo = betAmount.div(2);
        plays[hashValue].bet = 0;

        if(choice == playerTwoChoice){
            users[msgSender].balance = playerOneBalance.add(betAmountByTwo);
            users[playerTwoAddress].balance = playerTwoBalance.add(betAmountByTwo);
        }
        else if(
        (choice == 1 && playerTwoChoice == 2) ||
        (choice == 2 && playerTwoChoice == 3) ||
        (choice == 3 && playerTwoChoice == 1)){
            won = playerTwoAddress;
            playerBalance = playerTwoBalance;
        }
        else{
            won = msgSender;
            playerBalance = playerOneBalance;
        }

        if(won != address(0)){
            users[won].balance = playerBalance.add(betAmount);

            emit Reveal(hashValue, msgSender, choice);
        }

        return true;
    }

    function forceReveal(bytes32 hashValue) public onlyIfRunning returns(bool status){

        address msgSender = msg.sender;

        // Only the Remit Creator should be allowed to claim back
        require(plays[hashValue].playerTwo == msgSender, "Only second player can use this function");
        require(plays[hashValue].bet != 0, "Play Ended");
        require(plays[hashValue].deadline > now, "Force Reveal period has not started yet");

        users[msgSender].balance = users[msgSender].balance.add(plays[hashValue].bet);
        plays[hashValue].bet = 0;

        emit ForceReveal(hashValue, msgSender);

        return true;
    }

    function withdraw(uint256 amount) public onlyIfRunning returns(bool status){

        require(amount > 0, "Zero cant be withdrawn");

        address payable msgSender = msg.sender;

        users[msgSender].balance = users[msgSender].balance.sub(amount);

        emit Withdrawed(msgSender, amount);

        msgSender.transfer(amount);
        return true;

    }

}
