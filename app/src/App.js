import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import deploy from './deploy';
import Escrow from './Escrow';

const provider = new ethers.providers.Web3Provider(window.ethereum);

export async function approve(escrowContract, signer) {
  const approveTxn = await escrowContract.connect(signer).approve();
  await approveTxn.wait();
}

export async function setTimelock(escrowContract, signer, unlockTime) {
  const setTimelockTxn = await escrowContract.connect(signer).setTimelock(unlockTime);
  await setTimelockTxn.wait();
}

function App() {
  const [escrows, setEscrows] = useState([]);
  const [account, setAccount] = useState();
  const [signer, setSigner] = useState();
  const [loading, setLoading] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [contractToDelete, setContractToDelete] = useState(null);
  const [timelockValue, setTimelockValue] = useState('');
  const [showTimelockModal, setShowTimelockModal] = useState(false);
  const [contractToSetTimelock, setContractToSetTimelock] = useState(null);
  const [disableApproveButton, setDisableApproveButton] = useState(false); 
  const [showTimeSetPrompt, setShowTimeSetPrompt] = useState(false); 

  useEffect(() => {
    async function getAccounts() {
      const accounts = await provider.send('eth_requestAccounts', []);

      setAccount(accounts[0]);
      setSigner(provider.getSigner());
    }

    getAccounts();
  }, [account]);

  const toggleLoading = (isLoading) => setLoading(isLoading);
  const openConfirmationModal = () => setShowConfirmationModal(true);
  const closeConfirmationModal = () => setShowConfirmationModal(false);

  const openTimelockModal = (contractAddress) => {
    setShowTimelockModal(true);
    setContractToSetTimelock(contractAddress);
  };

  const closeTimelockModal = () => {
    setShowTimelockModal(false);
    setTimelockValue('');
    setContractToSetTimelock(null);
  };

  const handleConfirmDelete = () => {
    const index = escrows.findIndex((escrow) => escrow.address === contractToDelete);

    if (index !== -1) {
      const updatedEscrows = [...escrows];
      updatedEscrows.splice(index, 1);
      setEscrows(updatedEscrows);
    }

    closeConfirmationModal();
  };

  const handleSetTimelock = async () => {
    const unlockTime = parseInt(timelockValue);
    if (!isNaN(unlockTime)) {
      await setTimelock(contractToSetTimelock, signer, unlockTime);
      closeTimelockModal(); 
      const updatedEscrows = escrows.map((escrow) => {
        if (escrow.address === contractToSetTimelock) {
          return {
            ...escrow,
            isTimelockSet: true
          };
        }
        return escrow;
      });
      setEscrows(updatedEscrows);
      setDisableApproveButton(true);
      setTimeout(() => {
        setDisableApproveButton(false);
      }, 60000); 
      setShowTimeSetPrompt(true);
      setTimeout(() => {
        setShowTimeSetPrompt(false);
      }, 3000);
    }
  };

  const newContract = async () => {
    const beneficiary = document.getElementById('beneficiary').value;
    const arbiter = document.getElementById('arbiter').value;
    const value = ethers.BigNumber.from(document.getElementById('wei').value);
    const escrowContract = await deploy(signer, arbiter, beneficiary, value);

    const escrow = {
      address: escrowContract.address,
      arbiter,
      beneficiary,
      value: value.toString(),
      isTimelockSet: false, 
      handleApprove: async () => {
        toggleLoading(true); 
        escrowContract.on('Approved', () => {
          toggleLoading(false); 
          document.getElementById(escrowContract.address).className =
            'complete';
          document.getElementById(escrowContract.address).innerText =
            "✓ It's been approved!";
        });

        await approve(escrowContract, signer);
      },
      handleDelete: async (contractAddress) => {
        setContractToDelete(contractAddress);
        openConfirmationModal();
      },
      handleSetTimelock: async (contractAddress) => {
        setContractToSetTimelock(contractAddress);
        openTimelockModal(contractAddress);
      }
    };

    setEscrows([...escrows, escrow]);
  };

  return (
    <div className="w-full">
      <div className="w-full sm:max-w-md mx-auto bg-gray-200 shadow-lg rounded-lg px-6 py-8 mb-8">
        <h1 className="text-3xl font-semibold mb-6 text-gray-700">Create New Contract</h1>
        <div className="mb-6">
          <label className="block text-gray-600 text-sm font-semibold mb-2" htmlFor="arbiter">
            Broker
          </label>
          <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:shadow-outline" id="arbiter" type="text" placeholder="Enter Broker's Address" />
        </div>
        <div className="mb-6">
          <label className="block text-gray-600 text-sm font-semibold mb-2" htmlFor="beneficiary">
            Recipient
          </label>
          <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:shadow-outline" id="beneficiary" type="text" placeholder="Enter Recipient's Address" />
        </div>
        <div className="mb-6">
          <label className="block text-gray-600 text-sm font-semibold mb-2" htmlFor="wei">
            Amount
          </label>
          <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:shadow-outline" id="wei" type="text" placeholder="Enter Amount(WEI)" />
        </div>
        <button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full" onClick={newContract}>
          Deploy
        </button>
      </div>
    
      <div>
  <h1 className="text-3xl font-semibold mb-6 text-gray-700">List of All the Contracts</h1>
  <div className="grid gap-4">
    {escrows.map((escrow) => (
      <div key={escrow.address} className="bg-gray-100 shadow-md rounded-lg p-6">
        <Escrow {...escrow} />
        <div className="flex justify-between mt-4">
          <button className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:shadow-outline" onClick={() => escrow.handleDelete(escrow.address)}>
            Delete Contract
          </button>
          <button className={`bg-purple-500 hover:bg-purple-600 ${escrow.isTimelockSet ? 'bg-opacity-50 cursor-not-allowed' : 'hover:bg-yellow-600'} text-white font-semibold py-2 px-4 rounded focus:outline-none focus:shadow-outline`} onClick={() => escrow.handleSetTimelock(escrow.address)}>
            {escrow.isTimelockSet ? 'Timelocked' : 'Set Timelock'}
          </button>
        </div>
        {disableApproveButton && (
          <p className="text-red-500 mt-4">Approve button disabled for 1 minute</p>
        )}
      </div>
          ))}
        </div>
      </div>
    
      {loading && (
        <div className="flex items-center justify-center mt-2">
          <p className="ml-2 text-gray-700">Approving...</p>
        </div>
      )}
    
      {showConfirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-gray-200 shadow-lg rounded-lg px-6 py-8">
            <p className="text-lg font-semibold mb-4 text-gray-700">Are you sure you want to delete this contract?</p>
            <div className="flex justify-end">
              <button className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded mr-2 focus:outline-none focus:shadow-outline" onClick={handleConfirmDelete}>Yes</button>
              <button className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:shadow-outline" onClick={closeConfirmationModal}>No</button>
            </div>
          </div>
        </div>
      )}
    
      {showTimelockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-gray-200 shadow-lg rounded-lg px-6 py-8">
            <p className="text-lg font-semibold mb-4 text-gray-700">Set Timelock</p>
            <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-800 leading-tight focus:outline-none focus:shadow-outline" type="text" placeholder="Enter Unlock Time (Unix Timestamp)" value={timelockValue} onChange={(e) => setTimelockValue(e.target.value)} />
            <div className="flex justify-end mt-4">
              <button className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded mr-2 focus:outline-none focus:shadow-outline" onClick={closeTimelockModal}>Set</button>
              <button className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded focus:outline-none focus:shadow-outline" onClick={closeTimelockModal}>Cancel</button>
            </div>
            {showTimeSetPrompt && (
              <p className="text-green-500 mt-4">Time set successfully!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
