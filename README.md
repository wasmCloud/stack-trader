# Stack Trader

Stack Trader is a technology demonstration of [Waxosuit](https://waxosuit.io). It utilizes a distributed **Entity-Component-System** engine called [dECS Cloud](https://github.com/waxosuit/decs-cloud), which is also written in WebAssembly for hosting in Waxosuit.

## The Game

Players enter the universe with nothing but a ship and dreams of becoming rich. By seeking out rare minerals from asteroids and other stellar objects, you can mine them. By processing what you mine, you can make _stacks_, which you can then sell at a nearby star port. With your newfound riches, you can then explore further into space, discovering and harvesting new resources.

## How to run StackTrader

There is a simple demo available locally so you can see all of the moving parts in action. You will need to have a DockerHub account as well as an installation of Docker and the `docker-compose` utility.

Once you have that ready, navigate to the base directory of this repository and run `docker-compose -f testing/compose/stack-trader.yml up` to pull all required images for `dECS Cloud` and `StackTrader` and run the game. Navigate to `localhost` in your browser to view the game.

To stop the game you can use `CTRL+C` to stop the process, and for cleanup you can run `docker-compose -f testing/compose/stack-trader.yml down; docker-compose -f testing/compose/stack-trader.yml kill`.