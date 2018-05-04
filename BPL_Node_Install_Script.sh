#Each script starts with a shebang and the path to the shell that you want to use. shebang is '#!'
#!/bin/bash

GIT_CLONE_PATH=https://github.com/blockpool-io/BPL-node.git

#Basic installations
#install NTP
sudo apt-get install git
sudo apt-get install -y ntp
sudo service ntp restart
rm -rf BPL-node
#Clones the repository
echo -e "Clonning the repository $GIT_CLONE_PATH\n"
git clone $GIT_CLONE_PATH
#Change directory to BPL-node
echo -e "Change directory to BPL-node\n"
cd BPL-node

echo -e "Switched branch"
#Change the git branch
git checkout wbx

#Install it to avoid error
echo -e "Avoiding future errors by installing libpq-dev\n"
sudo apt-get -y update
sudo apt-get install -y libpq-dev
#Developer installations
#Install essentials:
echo -e "Install essentials:\n"
sudo apt-get install -y curl build-essential python git
#Install PostgreSQL (min version: 9.5.2)
echo -r "Install PostgreSQL (min version: 9.5.2)\n"

#Since the AWS instances do not have npm installed already thus we are installing it as further installations are done using npm
echo -e "Since the AWS instances do not have npm installed already thus we are installing it as further installations are done using npm\n"
sudo apt-get -y install npm
#Install Node.js (tested with version 6.9.2, but any recent LTS release should do):
echo -e "Install Node.js (tested with version 6.9.2, but any recent LTS release should do):\n"
sudo apt-get install -y nodejs
sudo npm install -g n
sudo n 6.9.2
sudo npm install forever -g
#Install grunt-cli (globally):
echo -e "#Install grunt-cli (globally):\n"
sudo npm install grunt-cli -g
#Install node modules:
echo -e "#Install node modules:\n"
npm install libpq secp256k1
npm install
sudo apt-get install -y postgresql postgresql-contrib
sudo -u postgres createuser -P --createdb $USER
dropdb wbx_mainnet
createdb wbx_mainnet  "this should match with the database name from config file"
forever start app.js -c config.wbx.mainnet.json -g genesisBlock.wbx.mainnet.json
#wait for chain to sync
sleep 10m
forever stop app.js -c config.wbx.mainnet.json -g genesisBlock.wbx.mainnet.json
read please update your delegate secret and press enter when finished.
forever start app.js -c config.wbx.mainnet.json -g genesisBlock.wbx.mainnet.json
