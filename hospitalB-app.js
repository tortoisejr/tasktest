/*
 * Hospital B Application - Data Access
 * Hospital B can request access to data shared by Hospital A
 */

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

// Helper function to pretty print JSON
function prettyJSONString(inputString) {
    if (inputString) {
        return JSON.stringify(JSON.parse(inputString), null, 2);
    }
    return inputString;
}

async function main() {
    try {
        console.log('=== Hospital B - Data Access Application ===');

        // Load connection profile
        const ccpPath = path.resolve(__dirname, '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        console.log('✓ Loaded connection profile');

        // Create wallet
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`✓ Wallet path: ${walletPath}`);

        // Check if HospitalB identity exists
        const identity = await wallet.get('HospitalB');
        if (!identity) {
            console.log('❌ HospitalB identity not found in wallet. Please run registerUsers.js first');
            process.exit(1);
        }
        console.log('✓ HospitalB identity loaded');

        // Create gateway
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'HospitalB',
            discovery: { enabled: true, asLocalhost: true }
        });
        console.log('✓ Gateway connected');

        // Get network and contract
        const network = await gateway.getNetwork('hospitalchannel');
        const contract = network.getContract('hospital');
        console.log('✓ Contract loaded');

        // Data IDs to check access for
        const dataIDs = ["PATIENT_001", "LAB_002", "MRI_003"];

        console.log('\n🔍 Checking access permissions...');

        for (const dataID of dataIDs) {
            try {
                console.log(`\nChecking access for: ${dataID}`);
                
                // Check if HospitalB has access
                const hasAccess = await contract.evaluateTransaction('RequestAccess', dataID, 'HospitalB');
                console.log(`Access for ${dataID}: ${hasAccess.toString()}`);

                if (hasAccess.toString() === 'true') {
                    console.log(`✅ Access GRANTED for ${dataID}`);
                    
                    // Retrieve the data
                    const data = await contract.evaluateTransaction('GetData', dataID, 'HospitalB');
                    const dataObj = JSON.parse(data.toString());
                    
                    console.log('📄 Retrieved Data:');
                    console.log(`   Data ID: ${dataObj.dataID}`);
                    console.log(`   From: ${dataObj.hospitalA}`);
                    console.log(`   IPFS Hash: ${dataObj.ipfsHash}`);
                    console.log(`   Description: ${dataObj.description}`);
                    console.log(`   Timestamp: ${dataObj.timestamp}`);
                } else {
                    console.log(`❌ Access DENIED for ${dataID}`);
                }

            } catch (error) {
                console.log(`⚠️  Note for ${dataID}: ${error.message}`);
            }
        }

        // Query all available data
        console.log('\n📋 Querying all data in ledger...');
        try {
            // const allData = await contract.evaluateTransaction('GetAllData');
            const allData = await contract.evaluateTransaction('GetAllData', 'HospitalB');
            console.log('All data in ledger:');
            console.log(prettyJSONString(allData.toString()));
        } catch (error) {
            console.log(`Note: Could not retrieve all data: ${error.message}`);
        }

        await gateway.disconnect();
        console.log('\n✅ Hospital B operations completed successfully!');

    } catch (error) {
        console.error(`❌ Failed to execute Hospital B application: ${error}`);
        process.exit(1);
    }
}

main();
