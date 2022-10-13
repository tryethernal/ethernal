import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';
import ethereum from '../mocks/ethereum';

jest.mock('@metamask/detect-provider');
import detectEthereumProvider from '@metamask/detect-provider';

import AmalfiContract from '../fixtures/AmalfiContract.json';

import Address from '@/components/Address.vue';

let helper;

describe('Address.vue', () => {

    beforeEach(() => {
        helper = new MockHelper({});
        jest.spyOn(helper.mocks.db, 'contractStorage')
            .mockReturnValue({
                once: jest.fn().mockResolvedValue()
            });
    });

    afterEach(() => jest.clearAllMocks());

    it('Should display the contract verified text if it is a public explorer & contract is not verified', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: { address: '0x123', name: 'Amalfi', abi: AmalfiContract.artifact.abi, verificationStatus: 'success' }});

        const wrapper = helper.mountFn(Address, {
            propsData: {
                hash: '0x123'
            },
            stubs: ['Address-Transactions-List', 'Contract-Call-Options'],
            getters: {
                accounts: jest.fn().mockReturnValueOnce(['0xAD2935E147b61175D5dc3A9e7bDa93B0975A43BA']),
                chain: jest.fn().mockReturnValueOnce('ethereum'),
                isPublicExplorer: jest.fn().mockReturnValueOnce(true),
                currentWorkspace: jest.fn(() => ({
                    isAdmin: false,
                    settings: {}
                }))
            }
        });

        await wrapper.vm.$nextTick();

        await wrapper.find('#codeTab').trigger('click');
        await wrapper.vm.$nextTick();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the contract verification UI if it is a public explorer & contract is verified', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: { address: '0x123', name: 'Amalfi', abi: AmalfiContract.artifact.abi }});

        const wrapper = helper.mountFn(Address, {
            propsData: {
                hash: '0x123'
            },
            stubs: ['Address-Transactions-List', 'Contract-Verification', 'Contract-Call-Options'],
            getters: {
                accounts: jest.fn().mockReturnValueOnce(['0xAD2935E147b61175D5dc3A9e7bDa93B0975A43BA']),
                chain: jest.fn().mockReturnValueOnce('ethereum'),
                isPublicExplorer: jest.fn().mockReturnValueOnce(true),
                currentWorkspace: jest.fn(() => ({
                    isAdmin: false,
                    settings: {}
                }))
            }
        });

        await wrapper.vm.$nextTick();

        await wrapper.find('#codeTab').trigger('click');
        await wrapper.vm.$nextTick();
        
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should not display the storage tab on contract page if in public explorer mode', async () => {
        const wrapper = helper.mountFn(Address, {
            propsData: {
                hash: '0x123'
            },
            stubs: ['Address-Transactions-List', 'Contract-Verification', 'Contract-Call-Options'],
            getters: {
                accounts: jest.fn().mockReturnValueOnce(['0xAD2935E147b61175D5dc3A9e7bDa93B0975A43BA']),
                isPublicExplorer: jest.fn().mockReturnValueOnce(true),
                currentWorkspace: jest.fn().mockReturnValueOnce({
                    isAdmin: false,
                    settings: {}
                })
            }
        });

        await new Promise(process.nextTick);

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should sync the balance when loaded', async () => {
        const wrapper = helper.mountFn(Address, {
            propsData: {
                hash: '0x123'
            },
            stubs: ['Address-Transactions-List', 'Contract-Verification']
        });
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.balance).toEqual('10000');
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the contract interaction interface under the contract tab if there is an ABI & it is a public explorer', async () => {
        detectEthereumProvider.mockResolvedValueOnce(window.ethereum);

        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: { address: '0x123', name: 'Amalfi', abi: AmalfiContract.artifact.abi }});

        const wrapper = helper.mountFn(Address, {
            propsData: {
                hash: '0x123'
            },
            stubs: ['Address-Transactions-List', 'Contract-Verification', 'Contract-Call-Options'],
            getters: {
                accounts: jest.fn().mockReturnValueOnce(['0xAD2935E147b61175D5dc3A9e7bDa93B0975A43BA']),
                chain: jest.fn().mockReturnValueOnce('ethereum'),
                isPublicExplorer: jest.fn().mockReturnValueOnce(true),
                currentWorkspace: jest.fn(() => ({
                    isAdmin: false,
                    settings: {}
                }))
            }
        });

        await wrapper.vm.$nextTick();

        await wrapper.find('#contractTab').trigger('click');
        await wrapper.vm.$nextTick();
        
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display the "Edit" button under the contract tab if there is an ABI & it is a public explorer & as admin', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: { address: '0x123', name: 'Amalfi', abi: AmalfiContract.artifact.abi }});

        detectEthereumProvider.mockResolvedValueOnce(window.ethereum);

        const wrapper = helper.mountFn(Address, {
            propsData: {
                hash: '0x123'
            },
            stubs: ['Address-Transactions-List', 'Contract-Verification', 'Contract-Call-Options'],
            getters: {
                accounts: jest.fn().mockReturnValueOnce(['0xAD2935E147b61175D5dc3A9e7bDa93B0975A43BA']),
                isPublicExplorer: jest.fn().mockReturnValueOnce(false),
                currentWorkspace: jest.fn(() => ({
                    isAdmin: true,
                    settings: {}
                }))
            }
        });

        await wrapper.vm.$nextTick();

        await wrapper.find('#contractTab').trigger('click');
        await wrapper.vm.$nextTick();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should say the contract is verified if it is a public explorer', async () => {
        detectEthereumProvider.mockResolvedValueOnce(window.ethereum);
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: { address: '0x123', name: 'Amalfi', abi: AmalfiContract.artifact.abi, verificationStatus: 'success' }});

        const wrapper = helper.mountFn(Address, {
            propsData: {
                hash: '0x123'
            },
            stubs: ['Address-Transactions-List', 'Contract-Verification', 'Contract-Call-Options'],
            getters: {
                accounts: jest.fn().mockReturnValueOnce(['0xAD2935E147b61175D5dc3A9e7bDa93B0975A43BA']),
                isPublicExplorer: jest.fn().mockReturnValueOnce(false),
                currentWorkspace: jest.fn(() => ({
                    isAdmin: true,
                    settings: {}
                }))
            }
        });
        await wrapper.vm.$nextTick();

        await wrapper.find('#contractTab').trigger('click');
        await wrapper.vm.$nextTick();

        expect(wrapper.html()).toMatchSnapshot();
    });

    it.only('Should display the contract storage structure', async () => {
        const storedDependencies = {};
        for (const dependency in AmalfiContract.dependencies)
            storedDependencies[dependency] = JSON.stringify(AmalfiContract.dependencies[dependency]);

        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: { address: '0x123', name: 'Amalfi', abi: AmalfiContract.artifact.abi }});
        jest.spyOn(helper.mocks.db, 'contractStorage')
            .mockReturnValueOnce({
                once: jest.fn((_, cb) => {
                        cb({
                            val: () => ({
                                artifact: AmalfiContract.artifact,
                                dependencies: storedDependencies
                            })
                        })
                        return new Promise(resolve => resolve());
                    })
            });
        jest.spyOn(helper.mocks.server, 'getStructure')
            .mockResolvedValueOnce({"data":{},"structure":{"nodes":[{"path":["_balances"],"label":"mapping(address => uint256) _balances:","key":"_balances","children":[],"index":1},{"path":["_allowances"],"label":"mapping(address => mapping(address => uint256)) _allowances:","key":"_allowances","children":[],"index":1},{"path":["_totalSupply"],"label":"uint256 _totalSupply;","key":"_totalSupply","children":null,"index":1},{"path":["_name"],"label":"string _name;","key":"_name","children":null,"index":1},{"path":["_symbol"],"label":"string _symbol;","key":"_symbol","children":null,"index":1},{"path":["_owner"],"label":"","key":"_owner","children":null,"index":1},{"path":["TOKEN_NAME"],"label":"string TOKEN_NAME;","key":"TOKEN_NAME","children":null,"index":1},{"path":["TOKEN_SYMBOL"],"label":"string TOKEN_SYMBOL;","key":"TOKEN_SYMBOL","children":null,"index":1},{"path":["val"],"label":"uint256 val;","key":"val","children":null,"index":1},{"path":["TOTAL_SUPPLY"],"label":"uint256 TOTAL_SUPPLY;","key":"TOTAL_SUPPLY","children":null,"index":1},{"path":["test"],"label":"","key":"test","children":null,"index":1},{"path":["testBugBytes"],"label":"","key":"testBugBytes","children":null,"index":1}],"index":0,"variables":[{"name":"_balances","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:650","typeName":"ERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"mapping","keyType":{"typeClass":"address","kind":"general","typeHint":"address"},"valueType":{"typeClass":"uint","bits":256,"typeHint":"uint256"},"location":"storage"},"kind":"value","value":[]}},{"name":"_allowances","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:650","typeName":"ERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"mapping","keyType":{"typeClass":"address","kind":"general","typeHint":"address"},"valueType":{"typeClass":"mapping","keyType":{"typeClass":"address","kind":"general","typeHint":"address"},"valueType":{"typeClass":"uint","bits":256,"typeHint":"uint256"},"location":"storage"},"location":"storage"},"kind":"value","value":[]}},{"name":"_totalSupply","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:650","typeName":"ERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"uint","bits":256,"typeHint":"uint256"},"kind":"value","value":{"asBN":{"negative":0,"words":[0,8778408,16443095,330872],"length":4,"red":null},"rawAsBN":{"negative":0,"words":[0,8778408,16443095,330872],"length":4,"red":null}}}},{"name":"_name","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:650","typeName":"ERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"string","location":"storage","typeHint":"string"},"kind":"value","value":{"kind":"valid","asString":"Example ERC20 Token"}}},{"name":"_symbol","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:650","typeName":"ERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"string","location":"storage","typeHint":"string"},"kind":"value","value":{"kind":"valid","asString":"XMPL"}}},{"name":"_owner","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:104","typeName":"Ownable","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"address","kind":"general","typeHint":"address"},"kind":"value","value":{"asAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","rawAsHex":"0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"}}},{"name":"TOKEN_NAME","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:2535","typeName":"ExampleERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"string","location":"storage","typeHint":"string"},"kind":"value","value":{"kind":"valid","asString":"Example ERC20 Token"}}},{"name":"TOKEN_SYMBOL","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:2535","typeName":"ExampleERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"string","location":"storage","typeHint":"string"},"kind":"value","value":{"kind":"valid","asString":"XMPL"}}},{"name":"val","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:2535","typeName":"ExampleERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"uint","bits":256,"typeHint":"uint256"},"kind":"value","value":{"asBN":{"negative":0,"words":[0],"length":1,"red":null},"rawAsBN":{"negative":0,"words":[0],"length":1,"red":null}}}},{"name":"TOTAL_SUPPLY","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:2535","typeName":"ExampleERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"uint","bits":256,"typeHint":"uint256"},"kind":"value","value":{"asBN":{"negative":0,"words":[0,8778408,16443095,330872],"length":4,"red":null},"rawAsBN":{"negative":0,"words":[0,8778408,16443095,330872],"length":4,"red":null}}}},{"name":"test","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:2535","typeName":"ExampleERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"bytes","kind":"static","length":32,"typeHint":"bytes32"},"kind":"value","value":{"asHex":"0x0000000000000000000000000000000000000000000000000000000000000000","rawAsHex":"0x0000000000000000000000000000000000000000000000000000000000000000"}}},{"name":"testBugBytes","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:2535","typeName":"ExampleERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"bytes","kind":"dynamic","location":"storage","typeHint":"bytes"},"kind":"value","value":{"asHex":"0x"}}}]}})

        const wrapper = helper.mountFn(Address, {
            propsData: {
                hash: '0x123'
            },
            stubs: ['Address-Transactions-List', 'Contract-Verification', 'Contract-Call-Options', 'Contract-Read-Method', 'Contract-Write-Method', 'Token-Balances', 'ERC-721-Collection'],
            getters: {
                isPublicExplorer: jest.fn().mockReturnValueOnce(false)
            }
        });

        await wrapper.vm.$nextTick();

        await wrapper.find('#storageTab').trigger('click');        
        await wrapper.vm.$nextTick();
        
        expect(wrapper.html()).toMatchSnapshot();
    });
});
