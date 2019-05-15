# DHT CHORD
A peer to peer network with Javascript, for audio, video, image, txt file sharing.

Taimoor Ali
20100217
Network Centric Computing 2019,Lums

DHT CHORD is peer to peer network built using Distributed Hash Tables. Currently configured to work on local host. Comment line no 154 and add your Ip to line no 17 to make it work inside a network.

Commands:

node DC.js port_Number
#I have used the port_Number to be the Hash of the Node.

connect
#To connect to a node, you will be prompted for the Ip and Port (hash) of that node.

Table
#to View the Finger Table

Neighbours
#To view the predecessor, successor and grandsuccessor of my node.

Leave
#To leave the Network.

Download
#To download a file from the network, you will be asked for the filename. You can download videos, audios, pdfs, txt, almost any type of files.

Upload
#To upload a file to the network, you will be prompted for the filname, you should provide the right path if it is not present in the current working directory.
