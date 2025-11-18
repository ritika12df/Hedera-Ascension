// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NFTReceipt
 * @dev ERC-721 NFT Receipt System for Hedera DeFi
 * Mints NFT receipts as proof of purchase or registration actions
 */

interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

contract NFTReceipt is IERC165 {
    // Token metadata
    string public constant name = "NFT Receipt";
    string public constant symbol = "RCPT";

    // Events
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event ReceiptMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        string actionType,
        uint256 timestamp
    );

    // State variables
    uint256 private _tokenIdCounter;
    
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    struct Receipt {
        uint256 tokenId;
        string actionType;
        uint256 timestamp;
        address recipient;
        string metadata;
    }

    mapping(uint256 => Receipt) public receipts;

    /**
     * @dev Mint a Buy receipt
     */
    function mintBuyReceipt(address to, string memory metadata)
        public
        returns (uint256)
    {
        return _mintReceipt(to, "Buy", metadata);
    }

    /**
     * @dev Mint a Register receipt
     */
    function mintRegisterReceipt(address to, string memory metadata)
        public
        returns (uint256)
    {
        return _mintReceipt(to, "Register", metadata);
    }

    /**
     * @dev Internal mint function
     */
    function _mintReceipt(
        address to,
        string memory actionType,
        string memory metadata
    ) internal returns (uint256) {
        require(to != address(0), "Invalid recipient");

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _owners[tokenId] = to;
        _balances[to]++;

        receipts[tokenId] = Receipt({
            tokenId: tokenId,
            actionType: actionType,
            timestamp: block.timestamp,
            recipient: to,
            metadata: metadata
        });

        emit Transfer(address(0), to, tokenId);
        emit ReceiptMinted(tokenId, to, actionType, block.timestamp);

        return tokenId;
    }

    /**
     * @dev Get total supply
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Get balance of address
     */
    function balanceOf(address owner) public view returns (uint256) {
        require(owner != address(0), "Invalid owner");
        return _balances[owner];
    }

    /**
     * @dev Get owner of token
     */
    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "Token does not exist");
        return owner;
    }

    /**
     * @dev Get receipt details
     */
    function getReceipt(uint256 tokenId)
        public
        view
        returns (Receipt memory)
    {
        require(_owners[tokenId] != address(0), "Receipt does not exist");
        return receipts[tokenId];
    }

    /**
     * @dev ERC165 support
     */
    function supportsInterface(bytes4 interfaceId)
        public
        pure
        override
        returns (bool)
    {
        return
            interfaceId == 0x80ac58cd || // ERC721
            interfaceId == 0x5b5e139f;   // ERC721Metadata
    }

    /**
     * @dev Approve token transfer
     */
    function approve(address to, uint256 tokenId) public {
        address owner = ownerOf(tokenId);
        require(msg.sender == owner || _operatorApprovals[owner][msg.sender],
            "Not authorized");
        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    /**
     * @dev Get approved address
     */
    function getApproved(uint256 tokenId) public view returns (address) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _tokenApprovals[tokenId];
    }

    /**
     * @dev Set approval for all
     */
    function setApprovalForAll(address operator, bool approved) public {
        require(operator != msg.sender, "Cannot approve yourself");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    /**
     * @dev Check if approved for all
     */
    function isApprovedForAll(address owner, address operator)
        public
        view
        returns (bool)
    {
        return _operatorApprovals[owner][operator];
    }

    /**
     * @dev Transfer token
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public {
        require(_owners[tokenId] == from, "Incorrect owner");
        require(to != address(0), "Invalid recipient");
        require(
            msg.sender == from ||
            msg.sender == _tokenApprovals[tokenId] ||
            _operatorApprovals[from][msg.sender],
            "Not authorized"
        );

        _tokenApprovals[tokenId] = address(0);
        _balances[from]--;
        _balances[to]++;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    /**
     * @dev Safe transfer with callback
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public {
        safeTransferFrom(from, to, tokenId, "");
    }

    /**
     * @dev Safe transfer with data
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public {
        transferFrom(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data),
            "Transfer rejected");
    }

    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) private returns (bool) {
        if (to.code.length > 0) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data)
            returns (bytes4 retval) {
                return retval == IERC721Receiver.onERC721Received.selector;
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("Transfer rejected");
                }
            }
        }
        return true;
    }
}
