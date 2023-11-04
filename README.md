# Llama.cui is a small llama.cpp chat application for Node.js 
![logo](https://github.com/deonis1/llcui/blob/main/logo.png)

**Note: This project is a work in progress.**

This project provides a Node.js server for a chat user interface (UI) that interacts with the Llama.cpp library. It allows users to communicate with the Llama.cpp application via a web-based chat interface.

## Installation

1. Clone the repository:

   git clone https://github.com/ggerganov/llama.cpp.git 

2. Build Lllama.cpp with GPU or CPU support

   cd llama.cpp

   sed -i 's/-arch=native/-arch=all/g' Makefile

   make clean && LLAMA_CUBLAS=1 make -j   # for GPU version

   or
   
   make # for CPU version

4. Clone llama.cui
   
   git clone https://github.com/deonis1/llama.cui

5. Download LLM model from [hugging face](https://huggingface.co/) in GGUF format, for example:
   a. Dolphin-Mistral 7B:  wget https://huggingface.co/TheBloke/dolphin-2.1-mistral-7B-GGUF/blob/main/dolphin-2.1-mistral-7b.Q5_0.gguf
   b. Mistral-Omnimix 11B: wget https://huggingface.co/TheBloke/Mistral-11B-OmniMix-GGUF/resolve/main/mistral-11b-omnimix-bf16.Q5_0.gguf

8. Install the project and set your configuration parameters
  
   cd llama.cui

   npm install

   Open config.js and change hostname, port, path to llama.cpp main file, and the model name/path

## Usage
To run just type:

npm start

## Login Information
Default login and password are specified in config file but could be easily integrated with user a database.
The login is currently set to false. To enable login set login to tru in config file and change password.

## Piper integration
As of version 1.15 the llama.cui supports Piper for text to voice generation.
Enable it in config.js, make sure to install piper before running llama.cui 


## Embeddings
llama.cui supports embeddings from text file (see docs folder) and mongodb (do npm install mongo and make changes to config.js to configure database) 
![Screenshot](https://github.com/deonis1/llcui/blob/main/Screenshot.png)

