import * as anchor from "@project-serum/anchor";
//import * as bs58 from "bs58";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, AnchorProvider, web3 } from "@project-serum/anchor";
import React from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import { useEffect, useState } from 'react';
import { Buffer } from 'buffer';
import { TOKEN_PROGRAM_ID, MINT_SIZE, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, createInitializeMintInstruction } from "@solana/spl-token";
import idl from "./idl.json";
//import * as anchor from "@project-serum/anchor";

const { SystemProgram, Keypair } = web3;

let mintKey = web3.Keypair.generate();
let baseaccount = web3.Keypair.generate();

window.Buffer = Buffer;
//let baseAccount = Keypair.generate();

const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl("devnet");
const opts = {
  preflightCommitment: "finalized" //processed
}

const getProvider = () => {
  const connection = new Connection(network, opts.preflightCommitment);

  const provider = new AnchorProvider(connection, window.solana, opts.preflightCommitment); //providerAux
  anchor.setProvider(provider);
  //const provider = AnchorProvider.env(); (not allowed in web)
  return provider;
}
const provider = getProvider();
const program = new Program(idl, programID, provider);
const connection = new Connection(network, opts.preflightCommitment);

// Constants
const TWITTER_HANDLE = 'VinciWorld';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

let response = undefined;
let associatedTokenAccount = undefined;

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValueMint, setInputValueMint] = useState("");
  const [inputValueBurn, setInputValueBurn] = useState("");
  const [gifList, setGifList] = useState([]);
  const checkIfWalletIsConencted = async () => {
    try {
      const { solana } = window;
      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found");

          response = await solana.connect({ onlyIfTrusted: true });
          console.log("Connected with Public Key: ", response.publicKey.toString());

          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("Solana object not found! Get a Phantom wallet");
      }
    } catch (error) {
      console.error(error);
    }
  }

  const connectWallet = async () => {
    const { solana } = window;
    if (solana) {
      const response = await solana.connect();
      console.log("Connected with Public Key: ", response.publicKey.toString());
    }
  };

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}>
      Connect Wallet
    </button>
  )

  const onInputChangeMint = event => {
    const { value } = event.target;
    setInputValueMint(value);
  }

  const onInputChangeBurn = event => {
    const { value } = event.target;
    setInputValueBurn(value);
  }

  const renderConnectedContainer = () => (
    <div className="connected-container">
      <button
        className="cta-button submit-gif-button"
        onClick={createATAaccount}>
        Create Account
      </button>
      
      <form>
        <input type="text" placeholder="Enter Ammount of Tokens" value={inputValueMint} onChange={onInputChangeMint} />
      </form>
      
      <button 
        className="cta-button submit-gif-button" 
        onClick={mintToken}>
        Claim!
      </button>
      
      <form>
        <input type="text" placeholder="Enter Ammount of Tokens" value={inputValueBurn} onChange={onInputChangeBurn} />
      </form>
      
      <button 
        className="cta-button submit-gif-button" 
        onClick={burnToken}>
        Burn!
      </button>
    </div>
  )

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConencted();
    }
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  const mintToken = async () => {
    try {
      //parse the ammount of Tokens to be mint
      let mintAmmount = parseInt(inputValueMint);

      //get the ATA address
      associatedTokenAccount = await getAssociatedTokenAddress(mintKey.publicKey, provider.wallet.publicKey);

      //Starts the Mint Operation
      console.log("Starting Mint Operation (Minting ", mintAmmount, " tokens)");
      const tx = await program.methods.mintToken(new anchor.BN(mintAmmount)).accounts({
            mint: mintKey.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            tokenAccount: associatedTokenAccount,
            payer: provider.wallet.publicKey,
        }).rpc();

      console.log(await program.provider.connection.getParsedAccountInfo(mintKey.publicKey));

      console.log("Account: ", tx);
      console.log("Mint Key: ", mintKey.publicKey.toString());
      console.log("User: ", baseaccount.publicKey.toString());
    }
    catch (error) {
      console.error("Error Minting Token: ", error);
    }
  }

  const burnToken = async () => {
    try {
      //parse the ammount of Tokens to be mint
      let burnAmmount = parseInt(inputValueBurn);

      //get the ATA address
      associatedTokenAccount = await getAssociatedTokenAddress(mintKey.publicKey, provider.wallet.publicKey);
      
      //Starts the Burn Operation
      console.log("Starting Burn Operation (Burning ", burnAmmount, " tokens)");
      const tx = await program.methods.burnToken(new anchor.BN(burnAmmount)).accounts({
          mint: mintKey.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          tokenAccount: associatedTokenAccount,
          payer: provider.wallet.publicKey,
      }).rpc();

      console.log(await program.provider.connection.getParsedAccountInfo(mintKey.publicKey));

      console.log("Account: ", tx);
      console.log("Mint Key: ", mintKey.publicKey.toString());
      console.log("User: ", baseaccount.publicKey.toString());
    }
    catch (error) {
      console.error("Error Burning Token: ", error);
    }
  }

  const createATAaccount = async () => {
    try {
      const lamports = await program.provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE);
      console.log(lamports);

      //Get the ATA for a token on a public key (but might not exist yet)
      associatedTokenAccount = await getAssociatedTokenAddress(mintKey.publicKey, provider.wallet.publicKey);

      const mint_tx = new web3.Transaction().add(
        //Use anchor to create an account from the key created (This will be our mint account) (PDA creation)        
        web3.SystemProgram.createAccount({
          fromPubkey: provider.wallet.publicKey, //response.publicKey or provider.wallet.publicKey
          newAccountPubkey: mintKey.publicKey,
          space: MINT_SIZE,
          programId: TOKEN_PROGRAM_ID,
          lamports,
        }),

        //creates, through a transaction, our mint account that is controlled by our anchor wallet (key)
        createInitializeMintInstruction(mintKey.publicKey, 0, provider.wallet.publicKey, provider.wallet.publicKey),

        //Creates the ATA account that is associated with our mint on our anchor wallet (key)
        createAssociatedTokenAccountInstruction(provider.wallet.publicKey, associatedTokenAccount, provider.wallet.publicKey, mintKey.publicKey)
      );

      console.log(mintKey.publicKey.toString());
      console.log(baseaccount.publicKey.toString());

      /* TEST: Send SOL to the newly created accounts */
      const airdropSignature1 = await connection.requestAirdrop(
        baseaccount.publicKey,
        web3.LAMPORTS_PER_SOL * 2,
      )
      let x = await connection.confirmTransaction(airdropSignature1);
      console.log(x);
      console.log(await connection.getBalance(baseaccount.publicKey));

      //Sends and create the transaction

      /********** To be improved and solved **********/

      console.log(provider);
      console.log(provider.wallet);
      console.log(connection);
      console.log(mint_tx);
      let blockhash = await connection.getLatestBlockhash('finalized');
      mint_tx.recentBlockhash = blockhash;
      mint_tx.feePayer = baseaccount.publicKey;
      console.log(mint_tx);
      console.log(response);
      console.log(solana);

      /*
      const signature = await web3.sendAndConfirmTransaction(
        connection,
        mint_tx,
        [baseaccount, mintKey],
      )
      */
      const signature = provider.sendAndConfirm(mint_tx, [mintKey]);
      console.log('SIGNATURE: ', signature);

      const res = await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseaccount.publicKey,
          user: response.publicKey,
          systemProgram: web3.SystemProgram.programId,
        },
        signers: [baseaccount]
      });

      //console.log(await program.provider.connection.getParsedAccountInfo(mintKey.publicKey));

      console.log("Account: ", res);

      let account = await program.account.baseAccount.fetch(baseaccount.publicKey);
      console.log("Total number of Gifs / Tokens = ", account.totalGifs.toString());
    }
    catch (error) {
      console.error("Error creating ATA account: ", error);
    }
  }

  useEffect(() => {
    if (walletAddress) {
      console.log("Yaaaayyyyy", new PublicKey(response.publicKey.toString()));

      //createATAaccount();
    }
  }, [walletAddress])

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header">💩Smart Contract Interaction💩</p>
          <p className="sub-text">
            🚀🚀🚀Interact with the Smart Contract(Work In Progress)🚀🚀🚀
          </p>
          <p className="sub-text">
            Before minting or burning tokens, create an Account in order to create the ATA account
          </p>
          {!walletAddress && renderNotConnectedContainer()};
          {walletAddress && renderConnectedContainer()};
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`Made By @${TWITTER_HANDLE} yaaayyy`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
