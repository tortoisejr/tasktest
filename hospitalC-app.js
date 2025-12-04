/*
 * Hospital C Application - Data Access Test
 * Hospital C tests access to data shared by Hospital A
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
        console.log('=== Hospital C - Data Access Test ===');

        // Load connection profile
        const ccpPath = path.resolve(__dirname, '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        console.log('✓ Loaded connection profile');

        // Create wallet
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`✓ Wallet path: ${walletPath}`);

        // Check if HospitalC identity exists
        const identity = await wallet.get('HospitalC');
        if (!identity) {
            console.log('❌ HospitalC identity not found in wallet. Please run registerUsers.js first');
            process.exit(1);
        }
        console.log('✓ HospitalC identity loaded');

        // Create gateway
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'HospitalC',
            discovery: { enabled: true, asLocalhost: true }
        });
        console.log('✓ Gateway connected');

        // Get network and contract
        const network = await gateway.getNetwork('hospitalchannel');
        const contract = network.getContract('hospital');
        console.log('✓ Contract loaded');

        // Test data access for HospitalC
        console.log('\n🔍 Testing Hospital C Access Permissions...');

        const testCases = [
            { dataID: "PATIENT_001", expected: "GRANTED", reason: "Shared with HospitalB,HospitalC" },
            { dataID: "LAB_002", expected: "DENIED", reason: "Shared with HospitalB only" },
            { dataID: "MRI_003", expected: "GRANTED", reason: "Shared with HospitalB,HospitalD" }
        ];

        for (const testCase of testCases) {
            try {
                console.log(`\n📋 Testing: ${testCase.dataID}`);
                console.log(`   Expected: ${testCase.expected} (${testCase.reason})`);
                
                // Check access permission
                const hasAccess = await contract.evaluateTransaction('RequestAccess', testCase.dataID, 'HospitalC');
                console.log(`   Access Result: ${hasAccess.toString()}`);
                
                if (hasAccess.toString() === 'true') {
                    console.log(`   ✅ Access GRANTED - Retrieving data...`);
                    
                    // Retrieve the actual data
                    const data = await contract.evaluateTransaction('GetData', testCase.dataID, 'HospitalC');
                    const dataObj = JSON.parse(data.toString());
                    
                    console.log(`   📄 Retrieved Data Details:`);
                    console.log(`      - Data ID: ${dataObj.dataID}`);
                    console.log(`      - From Hospital: ${dataObj.hospitalA}`);
                    console.log(`      - IPFS Hash: ${dataObj.ipfsHash}`);
                    console.log(`      - Description: ${dataObj.description}`);
                    console.log(`      - Allowed Hospitals: ${dataObj.allowedHospitals}`);
                    
                } else {
                    console.log(`   ❌ Access DENIED`);
                    console.log(`   💡 Hospital C cannot access this data`);
                }

            } catch (error) {
                console.log(`   ⚠️  Error: ${error.message}`);
            }
        }

        // Try to query all data (should only see metadata, not actual data without permission)
        console.log('\n📋 Querying all data metadata...');
        try {
            const allData = await contract.evaluateTransaction('GetAllData', 'HospitalC');
            console.log('All data records in ledger:');
            console.log(prettyJSONString(allData.toString()));
        } catch (error) {
            console.log(`Note: Could not retrieve all data: ${error.message}`);
        }

        await gateway.disconnect();
        console.log('\n✅ Hospital C access test completed!');

    } catch (error) {
        console.error(`❌ Failed to execute Hospital C application: ${error}`);
        process.exit(1);
    }
}

main();