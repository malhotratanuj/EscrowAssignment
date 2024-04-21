import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import deploy from './deploy';
import Escrow from './Escrow';
import { SyncLoader } from 'react-spinners';

const provider = new ethers.providers.Web3Provider(window.ethereum);

export async function approve(escrowContract, signer) {
  const approveTxn = await escrowContract.connect(signer).approve();
  await approveTxn.wait();
}

function App() {
  const [escrows, setEscrows] = useState([]);
  const [account, setAccount] = useState();
  const [signer, setSigner] = useState();
  const [loading, setLoading] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [contractToDelete, setContractToDelete] = useState(null);

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

  async function newContract() {
    const beneficiary = document.getElementById('beneficiary').value;
    const arbiter = document.getElementById('arbiter').value;
    const value = ethers.BigNumber.from(document.getElementById('wei').value);
    const escrowContract = await deploy(signer, arbiter, beneficiary, value);


    const escrow = {
      address: escrowContract.address,
      arbiter,
      beneficiary,
      value: value.toString(),
      handleApprove: async () => {
        toggleLoading(true); // Show loading animation
        escrowContract.on('Approved', () => {
          toggleLoading(false); // Hide loading animation after approval
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
      }
    };

    setEscrows([...escrows, escrow]);
  }

  const handleConfirmDelete = () => {
    // Find the index of the contract to delete
    const index = escrows.findIndex((escrow) => escrow.address === contractToDelete);

    // If the contract is found, remove it from the array
    if (index !== -1) {
      const updatedEscrows = [...escrows];
      updatedEscrows.splice(index, 1);
      setEscrows(updatedEscrows);
    }

    // Close the confirmation modal
    closeConfirmationModal();
  };

  return (
    <>
      <div className="contract">
        <h1> New Contract </h1>
        <label>
          Arbiter Address
          <input type="text" id="arbiter" />
        </label>

        <label>
          Beneficiary Address
          <input type="text" id="beneficiary" />
        </label>

        <label>
          Deposit Amount (in Wei)
          <input type="text" id="wei" />
        </label>

        <div
          className="button"
          id="deploy"
          onClick={(e) => {
            e.preventDefault();

            newContract();
          }}
        >
          Deploy
        </div>
      </div>

      <div className="existing-contracts">
        <h1> Existing Contracts </h1>

        <div id="container">
          {escrows.map((escrow) => {
            return (
              <div key={escrow.address}>
                <Escrow {...escrow} />
                <div
                  className="button"
                  onClick={() => escrow.handleDelete(escrow.address)}
                >
                  Delete Contract
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="loading">
          <SyncLoader color={'#36D7B7'} loading={loading} size={15} />
          <p>Approving...</p>
        </div>
      )}

      {showConfirmationModal && (
        <div className="modal">
          <div className="modal-content">
            <p>Are you sure you want to delete this contract?</p>
            <div className="modal-buttons">
              <button onClick={handleConfirmDelete}>Yes</button>
              <button onClick={closeConfirmationModal}>No</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
