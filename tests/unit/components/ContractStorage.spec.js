import flushPromises from 'flush-promises';
import MockHelper from '../MockHelper';
import ethereum from '../mocks/ethereum';
import AmalfiContract from '../fixtures/AmalfiContract.json';

jest.mock('@metamask/detect-provider');
import detectEthereumProvider from '@metamask/detect-provider';
import ContractStorage from '@/components/ContractStorage.vue';

let helper;
const stubs = [
    'Storage-Structure',
    'Transaction-Picker',
    'Transaction-Data'
];

describe('ContractStorage.vue', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        helper = new MockHelper();
    });

    it('Should display storage structure', async () => {
        const storedDependencies = {};
        for (const dependency in AmalfiContract.dependencies)
            storedDependencies[dependency] = JSON.stringify(AmalfiContract.dependencies[dependency]);
        const ast = {
            artifact: AmalfiContract.artifact,
            dependencies: storedDependencies
        };

        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: {
                name: 'Amalfi',
                abi: AmalfiContract.artifact.abi,
                ast: ast
            }});
        jest.spyOn(helper.mocks.server, 'getStructure')
            .mockResolvedValueOnce({"data":{},"structure":{"nodes":[{"path":["_balances"],"label":"mapping(address => uint256) _balances:","key":"_balances","children":[],"index":1},{"path":["_allowances"],"label":"mapping(address => mapping(address => uint256)) _allowances:","key":"_allowances","children":[],"index":1},{"path":["_totalSupply"],"label":"uint256 _totalSupply;","key":"_totalSupply","children":null,"index":1},{"path":["_name"],"label":"string _name;","key":"_name","children":null,"index":1},{"path":["_symbol"],"label":"string _symbol;","key":"_symbol","children":null,"index":1},{"path":["_owner"],"label":"","key":"_owner","children":null,"index":1},{"path":["TOKEN_NAME"],"label":"string TOKEN_NAME;","key":"TOKEN_NAME","children":null,"index":1},{"path":["TOKEN_SYMBOL"],"label":"string TOKEN_SYMBOL;","key":"TOKEN_SYMBOL","children":null,"index":1},{"path":["val"],"label":"uint256 val;","key":"val","children":null,"index":1},{"path":["TOTAL_SUPPLY"],"label":"uint256 TOTAL_SUPPLY;","key":"TOTAL_SUPPLY","children":null,"index":1},{"path":["test"],"label":"","key":"test","children":null,"index":1},{"path":["testBugBytes"],"label":"","key":"testBugBytes","children":null,"index":1}],"index":0,"variables":[{"name":"_balances","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:650","typeName":"ERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"mapping","keyType":{"typeClass":"address","kind":"general","typeHint":"address"},"valueType":{"typeClass":"uint","bits":256,"typeHint":"uint256"},"location":"storage"},"kind":"value","value":[]}},{"name":"_allowances","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:650","typeName":"ERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"mapping","keyType":{"typeClass":"address","kind":"general","typeHint":"address"},"valueType":{"typeClass":"mapping","keyType":{"typeClass":"address","kind":"general","typeHint":"address"},"valueType":{"typeClass":"uint","bits":256,"typeHint":"uint256"},"location":"storage"},"location":"storage"},"kind":"value","value":[]}},{"name":"_totalSupply","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:650","typeName":"ERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"uint","bits":256,"typeHint":"uint256"},"kind":"value","value":{"asBN":{"negative":0,"words":[0,8778408,16443095,330872],"length":4,"red":null},"rawAsBN":{"negative":0,"words":[0,8778408,16443095,330872],"length":4,"red":null}}}},{"name":"_name","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:650","typeName":"ERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"string","location":"storage","typeHint":"string"},"kind":"value","value":{"kind":"valid","asString":"Example ERC20 Token"}}},{"name":"_symbol","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:650","typeName":"ERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"string","location":"storage","typeHint":"string"},"kind":"value","value":{"kind":"valid","asString":"XMPL"}}},{"name":"_owner","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:104","typeName":"Ownable","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"address","kind":"general","typeHint":"address"},"kind":"value","value":{"asAddress":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","rawAsHex":"0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"}}},{"name":"TOKEN_NAME","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:2535","typeName":"ExampleERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"string","location":"storage","typeHint":"string"},"kind":"value","value":{"kind":"valid","asString":"Example ERC20 Token"}}},{"name":"TOKEN_SYMBOL","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:2535","typeName":"ExampleERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"string","location":"storage","typeHint":"string"},"kind":"value","value":{"kind":"valid","asString":"XMPL"}}},{"name":"val","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:2535","typeName":"ExampleERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"uint","bits":256,"typeHint":"uint256"},"kind":"value","value":{"asBN":{"negative":0,"words":[0],"length":1,"red":null},"rawAsBN":{"negative":0,"words":[0],"length":1,"red":null}}}},{"name":"TOTAL_SUPPLY","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:2535","typeName":"ExampleERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"uint","bits":256,"typeHint":"uint256"},"kind":"value","value":{"asBN":{"negative":0,"words":[0,8778408,16443095,330872],"length":4,"red":null},"rawAsBN":{"negative":0,"words":[0,8778408,16443095,330872],"length":4,"red":null}}}},{"name":"test","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:2535","typeName":"ExampleERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"bytes","kind":"static","length":32,"typeHint":"bytes32"},"kind":"value","value":{"asHex":"0x0000000000000000000000000000000000000000000000000000000000000000","rawAsHex":"0x0000000000000000000000000000000000000000000000000000000000000000"}}},{"name":"testBugBytes","class":{"typeClass":"contract","kind":"native","id":"shimmedcompilation:2535","typeName":"ExampleERC20","contractKind":"contract","payable":false},"value":{"type":{"typeClass":"bytes","kind":"dynamic","location":"storage","typeHint":"bytes"},"kind":"value","value":{"asHex":"0x"}}}]}});

        const wrapper = helper.mountFn(ContractStorage, {
            propsData: {
                address: '0x123'
            },
            stubs: stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display admin error message', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: {
                address: '0x123'
            }});
        const wrapper = helper.mountFn(ContractStorage, {
            propsData: {
                address: '0x123'
            },
            stubs: stubs
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });

    it('Should display non admin error message', async () => {
        jest.spyOn(helper.mocks.server, 'getContract')
            .mockResolvedValueOnce({ data: {
                address: '0x123'
            }});
        const wrapper = helper.mountFn(ContractStorage, {
            propsData: {
                address: '0x123'
            },
            stubs: stubs,
            getters: {
                isUserAdmin: jest.fn(() => false)
            }
        });

        await flushPromises();
        expect(wrapper.html()).toMatchSnapshot();
    });
});
