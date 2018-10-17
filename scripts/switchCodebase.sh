#!/bin/bash
PARENT_DIR=$PWD
GREEN_DIR_PATH=$PWD/../../Green/BPL-node
BLUE_DIR_PATH=$PWD/../../Blue/BPL-node
FIRST_PATH=$PWD/../BPLNode/Blue/BPL-node
DATE=`date '+%Y-%m-%d %H:%M:%S'`
NEW_DIR_PATH=""
CURRENT_DIR_PATH=""

FLAG=0
CONFIG=$1
GENESIS=$2
PORT=$3

######################################
# Function to write logs in log file #
######################################
function log()
{
    echo "[$1] $DATE | $2 "  >> $LOG_FILE
}

#############################################
# Function to stop the current node process #
#############################################
function stopNode()
{
    log "INF" "Killing current node process from directory $CURRENT_DIR_PATH"
    temp=$(forever stop app.js -c $CONFIG -g $GENESIS)
    temp=$(forever stop app.js)
    temp=$(forever stop app.js --config $CONFIG --genesis $GENESIS)
    temp=$(kill -9 $(lsof -t -i:$PORT))
    log "INF" "Process killed succesfully from $CURRENT_DIR_PATH"

}

##############################
# Function to start the node #
##############################
function startNode()
{   
    cd $NEW_DIR_PATH
    log "INF" "Starting the node process in directory $NEW_DIR_PATH"
    temp=$(forever start app.js -c $CONFIG -g $GENESIS)
}

################################
# Function to copy config file #
################################
function copyConfig()
{
    log "INF" "Copying the $CONFIG file from directory $CURRENT_DIR_PATH to $NEW_DIR_PATH"
    node $PWD/scripts/copyConfig.js $NEW_DIR_PATH $CONFIG
}


function main()
{
    createLogFile

    if [[ $PWD =~ 'Blue' ]]
      then
        if [[ -d "$GREEN_DIR_PATH" ]]
          then
            NEW_DIR_PATH=$GREEN_DIR_PATH
            CURRENT_DIR_PATH=$PWD
            FLAG=1
          else
              log "ERR" "Failed to switch code base to $GREEN_DIR_PATH, directory Green not found"
        fi

      elif [[ $PWD =~ 'Green' ]]
        then
          if [[ -d "$BLUE_DIR_PATH" ]]
            then
                NEW_DIR_PATH=$BLUE_DIR_PATH
                CURRENT_DIR_PATH=$PWD
                FLAG=1
            else
                log "ERR" "Failed to switch code base to $BLUE_DIR_PATH, directory Blue not found"
          fi

      elif [[ $PWD =~ 'BPL-node' ]]
        then
          if [[ -d "$FIRST_PATH" ]]
            then
                NEW_DIR_PATH=$FIRST_PATH
                CURRENT_DIR_PATH=$PWD
                FLAG=1
            else
                log "ERR" "Failed to switch code base to $FIRST_PATH, directory Blue not found"
          fi
    fi

    if [ $FLAG ]
        then
            copyConfig
            stopNode
            startNode
    fi
}

###############################
# Function to create log file #
###############################
function createLogFile()
{
if [ -e $PARENT_DIR/../../../BPLNode ]
  then
      LOG_FILE=$PARENT_DIR/../../softwareUpdates.log
  else
      LOG_FILE=$PARENT_DIR/../BPLNode/softwareUpdates.log
fi
}

main
