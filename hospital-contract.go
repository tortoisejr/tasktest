package main

import (
    "encoding/json"
    "fmt"
    "strings"

    "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// HospitalData represents hospital data with access control
type HospitalData struct {
    DataID           string `json:"dataID"`
    HospitalA        string `json:"hospitalA"`
    IPFSHash         string `json:"ipfsHash"`
    Description      string `json:"description"`
    AllowedHospitals string `json:"allowedHospitals"` // Comma-separated list
}

// HospitalContract provides functions for managing hospital data sharing
type HospitalContract struct {
    contractapi.Contract
}

// ShareData allows Hospital A to share data (IPFS hash) with specific hospitals
func (s *HospitalContract) ShareData(ctx contractapi.TransactionContextInterface, 
    dataID string, hospitalA string, ipfsHash string, description string, allowedHospitals string) error {
    
    fmt.Printf("ShareData called - DataID: %s, HospitalA: %s\n", dataID, hospitalA)

    // Check if data already exists
    existing, err := ctx.GetStub().GetState(dataID)
    if err != nil {
        return fmt.Errorf("failed to read from world state: %v", err)
    }
    if existing != nil {
        return fmt.Errorf("data with ID %s already exists", dataID)
    }

    // Create hospital data
    hospitalData := HospitalData{
        DataID:           dataID,
        HospitalA:        hospitalA,
        IPFSHash:         ipfsHash,
        Description:      description,
        AllowedHospitals: allowedHospitals,
    }

    // Convert to JSON
    dataJSON, err := json.Marshal(hospitalData)
    if err != nil {
        return fmt.Errorf("failed to marshal hospital data: %v", err)
    }

    // Store in ledger
    err = ctx.GetStub().PutState(dataID, dataJSON)
    if err != nil {
        return fmt.Errorf("failed to put hospital data in world state: %v", err)
    }

    fmt.Printf("Successfully shared data with ID: %s\n", dataID)
    return nil
}

// RequestAccess allows Hospital B to check if they have access to data
func (s *HospitalContract) RequestAccess(ctx contractapi.TransactionContextInterface, dataID string, hospitalB string) (bool, error) {
    fmt.Printf("RequestAccess called - DataID: %s, HospitalB: %s\n", dataID, hospitalB)

    // Get the data from ledger
    dataJSON, err := ctx.GetStub().GetState(dataID)
    if err != nil {
        return false, fmt.Errorf("failed to read from world state: %v", err)
    }
    if dataJSON == nil {
        return false, fmt.Errorf("data with ID %s does not exist", dataID)
    }

    var hospitalData HospitalData
    err = json.Unmarshal(dataJSON, &hospitalData)
    if err != nil {
        return false, fmt.Errorf("failed to unmarshal hospital data: %v", err)
    }

    // Check if Hospital B is in the allowed list (comma-separated)
    allowedList := strings.Split(hospitalData.AllowedHospitals, ",")
    for _, allowedHospital := range allowedList {
        if strings.TrimSpace(allowedHospital) == hospitalB {
            fmt.Printf("Access GRANTED for Hospital %s to DataID: %s\n", hospitalB, dataID)
            return true, nil
        }
    }

    fmt.Printf("Access DENIED for Hospital %s to DataID: %s\n", hospitalB, dataID)
    return false, nil
}

// GetData allows authorized hospitals to retrieve the IPFS hash
func (s *HospitalContract) GetData(ctx contractapi.TransactionContextInterface, dataID string, requestingHospital string) (*HospitalData, error) {
    fmt.Printf("GetData called - DataID: %s, RequestingHospital: %s\n", dataID, requestingHospital)

    // Get the data from ledger
    dataJSON, err := ctx.GetStub().GetState(dataID)
    if err != nil {
        return nil, fmt.Errorf("failed to read from world state: %v", err)
    }
    if dataJSON == nil {
        return nil, fmt.Errorf("data with ID %s does not exist", dataID)
    }

    var hospitalData HospitalData
    err = json.Unmarshal(dataJSON, &hospitalData)
    if err != nil {
        return nil, fmt.Errorf("failed to unmarshal hospital data: %v", err)
    }

    // Check access permission
    hasAccess := false
    allowedList := strings.Split(hospitalData.AllowedHospitals, ",")
    for _, allowedHospital := range allowedList {
        if strings.TrimSpace(allowedHospital) == requestingHospital {
            hasAccess = true
            break
        }
    }

    if !hasAccess {
        return nil, fmt.Errorf("hospital %s does not have permission to access data %s", requestingHospital, dataID)
    }

    fmt.Printf("Data retrieved successfully for Hospital %s\n", requestingHospital)
    return &hospitalData, nil
}

// // GetAllData returns all hospital data
// func (s *HospitalContract) GetAllData(ctx contractapi.TransactionContextInterface) ([]*HospitalData, error) {
//     fmt.Println("GetAllData called")

//     resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
//     if err != nil {
//         return nil, err
//     }
//     defer resultsIterator.Close()

//     var dataList []*HospitalData
//     for resultsIterator.HasNext() {
//         queryResponse, err := resultsIterator.Next()
//         if err != nil {
//             return nil, err
//         }

//         var hospitalData HospitalData
//         err = json.Unmarshal(queryResponse.Value, &hospitalData)
//         if err != nil {
//             return nil, err
//         }
//         dataList = append(dataList, &hospitalData)
//     }

//     fmt.Printf("Retrieved %d data records\n", len(dataList))
//     return dataList, nil
// }
// GetAllData returns only data that the requesting hospital can access
func (s *HospitalContract) GetAllData(ctx contractapi.TransactionContextInterface, requestingHospital string) ([]*HospitalData, error) {
    fmt.Printf("GetAllData called by: %s\n", requestingHospital)

    resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
    if err != nil {
        return nil, err
    }
    defer resultsIterator.Close()

    var accessibleData []*HospitalData
    for resultsIterator.HasNext() {
        queryResponse, err := resultsIterator.Next()
        if err != nil {
            return nil, err
        }

        var hospitalData HospitalData
        err = json.Unmarshal(queryResponse.Value, &hospitalData)
        if err != nil {
            return nil, err
        }

        // CHECK PERMISSIONS for each record
        hasAccess := false
        allowedList := strings.Split(hospitalData.AllowedHospitals, ",")
        for _, allowedHospital := range allowedList {
            if strings.TrimSpace(allowedHospital) == requestingHospital {
                hasAccess = true
                break
            }
        }

        if hasAccess {
            accessibleData = append(accessibleData, &hospitalData)
        }
    }

    fmt.Printf("Retrieved %d accessible records for %s\n", len(accessibleData), requestingHospital)
    return accessibleData, nil
}
