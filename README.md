# BLOCKPOOL


# Simple Blockpool Node Installation #

Download the Blockpool install script

https://github.com/blockpool-io/BPL-node/blob/bpl-mainnet/BPL_Node_Install_Script.sh

Open up your terminal
./BPL_Node_Install_Script.sh

Let the script finish.

**Add configurations for your node**

```
	Change the following in config.mainnet.json :
“address“: “set your IP”
“database”: “set database name”
“user”: “set database user”
“password”: “set database password”
“list”: [
	{
		“ip”: “set your IP address”
		“port”: “set the port on which your node will be running”
	},
{
		“ip”: “Set seed node IP address”
		“port”: “set the port on which seed node will be running”
	}
]
```

**Launch BPL node**

```
To launch BPL node on mainnet:
forever start app.js -c config.mainnet.json -g genesisBlock.mainnet.json
```

# Detailed steps for setting up BPL node on Linux, Windows and Debian


**Linux/Ubuntu (We have tested with Ubuntu v16.0.4)**


**Developer Installation**


**Install essentials**

```
sudo apt-get update
sudo apt-get install -y curl build-essential python git
```

**Install Node.js (min version: 6.9.2)**

```
sudo apt-get install -y nodejs
sudo apt-get install -y npm
sudo npm install -g n
sudo n 6.9.2
```

**Install grunt-cli (globally)**

```
sudo npm install grunt-cli -g
```

**Install PostgreSQL (min version: 9.5.2)**

```
sudo apt-get install -y postgresql postgresql-contrib
sudo -u postgres createuser -P --createdb $USER
createdb ‘Database Name’  (this should match with the database name from config file)
```

**Clone BPL Node repository**

```
git clone https://github.com/blockpool-io/BPL-node.git   (make sure you have git installed)
cd BPL-node
git checkout bpl-mainnet
```

**Install node modules**

```
sudo apt-get install -y libpq-dev
npm install libpq secp256k1
npm install
npm install forever -g
```

**Add configurations for your node**

```
	Change the following in config.mainnet.json :
“address“: “set your IP”
“database”: “set database name”
“user”: “set database user”
“password”: “set database password”
“list”: [
	{
		“ip”: “set your IP address”
		“port”: “set the port on which your node will be running”
	},
{
		“ip”: “Set seed node IP address”
		“port”: “set the port on which seed node will be running”
	}
]
```

**Launch BPL node**

```
To launch BPL node on mainnet:
forever start app.js -c config.mainnet.json -g genesisBlock.mainnet.json
```


# Windows 7

**Developer Installation**
**Install essentials**

```
 Python(min version 2.7.0) URL -  https://www.python.org/downloads/ 
 Visual Studio c++ 2010 express
```
```
Install Node.js (min version 6.9.2)
 URL - https://nodejs.org/en/download/
```
```
 Install PostgreSQL (min version 5.5.2)
 URL -  http://www.postgresql.org/download/windows/
```

**Add following environment variable:**

```
PATH as C:\Program Files\PostgreSQL\9.5\bin 
(Windows Start -> Right click on Computer → Advanced System settings → Environment variables)
Modify the file ‘pg_hba’, present at the location  C:\Program Files\PostgreSQL\9.5\data\pg_hba
Replace ‘md5’ with ‘trust’  under ‘METHOD’ column
```


**Restart psql:**

```
My Computer → Manage → Services and Application → Services → Restart postgres service
Alter postgres user:
psql -U postgres
alter user postgres with password 'User Password'
Create database:
Create database ‘Database Name’ Name’  (this should match with the database name from config file)
```

**Clone repository**

```
git clone https://github.com/blockpool-io/BPL-node.git (make sure you have git installed)
cd BPL-node
git checkout bpl-mainnet
```

**Install node modules**

```
npm install --global --production windows-build-tools 
npm install libpq secp256k1
npm install
```

**Add configurations for your node**

```
Change the following in config.mainnet.json:
“address“: “set your IP”
“database”: “set database name”
“user”: “set database user”
“password”: “set database password”
“list”: [
	{
		“ip”: “set your IP address”
		“port”: “set the port on which your node will be running”
},
{
//For 5 Windows nodes, seed IP is already configured in the shared 5 files so no need of adding this entry
		“ip”: “Set seed node IP address”
		“port”: “set the port on which seed node will be running”
}
]
```

**Launch BPL node**
**To launch BPL on mainnet:**

```
npm run start:bplmainnet
```



# Debian- (We have tested with Jessie 8.7)

**Developer Installation**
**Install essentials**

```
sudo apt-get update
sudo apt-get install -y curl build-essential python git
```

**Install Node.js (min version: 6.9.2)**

```
sudo apt-get install -y nodejs
sudo apt-get intsall -y npm
sudo npm install -g n
sudo n 6.9.2
```

**Install grunt-cli (globally)**

```
sudo npm install grunt-cli -g
```

**Install PostgreSQL (min version: 9.5.2)**
**Since Debian 8.8/8.8 installs psql 9.4.12 , we will need to add the repository manually to install psql 9.5:**

```
wget -q https://www.postgresql.org/media/keys/ACCC4CF8.asc -O - | sudo apt-key add -
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt/ jessie-pgdg main" >> /etc/apt/sources.list.d/pgdg.list'
sudo apt-get update
sudo apt-get install -y postgresql-9.5
sudo -u postgres createuser –createdb $USER
createdb ‘Database Name’  (this should match with the database name from config file)
```

**Clone BPL Node repository**

```
If git is not found, following adds the repository manually:
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys E1DD270288B4E6030699E45FA1715D88E1DF1F24
sudo su -c "echo 'deb http://ppa.launchpad.net/git-core/ppa/ubuntu trusty main' > /etc/apt/sources.list.d/git.list"
sudo apt-get -y update
sudo apt-get install -y git

git clone https://github.com/blockpool-io/BPL-node.git   (make sure you have git installed)
cd BPL-node
git checkout mainnet
```

**Install node modules**

```
sudo apt-get install libpq-dev
npm install libpq secp256k1
npm install
```

**Add configurations for your node**
**Change the following in config.mainnet.json:**

```
“address“: “set your IP”
“database”: “set database name”
“user”: “set database user”
“password”: “set database password”
“list”: [
	{
		“ip”: “set your IP address”
		“port”: “set the port on which your node will be running”
	},
{
		“ip”: “Set seed node IP address”
		“port”: “set the port on which seed node will be running”
	}
]
```

**Launch BPL node**
**To launch BPL node on mainnet:**

```
npm run start:bplmainnet
```

```
,,,,,,,,,,,,
```


## Authors
- Raj Singh <rsingh@blockpool.io>
- Brandon Cook <bcook@blockpool.io>
- FX Thoorens <fx.thoorens@ark.io>
- Boris Povod <boris@crypti.me>
- Pavel Nekrasov <landgraf.paul@gmail.com>
- Sebastian Stupurac <stupurac.sebastian@gmail.com>
- Oliver Beddows <oliver@lisk.io>

## License

The MIT License (MIT)

Copyright (c) 2016 BlockPool
Copyright (c) 2016 Ark
Copyright (c) 2016 Lisk
Copyright (c) 2014-2015 Crypti

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:  

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
