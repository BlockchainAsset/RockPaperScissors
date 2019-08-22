pragma solidity >=0.4.22 <0.6.0;

import "./Stoppable.sol";
import "./SafeMath.sol";

contract RockPaperScissors is Stoppable{
    using SafeMath for uint;

    constructor(bool initialRunState) public Stoppable(initialRunState){
    }

}
