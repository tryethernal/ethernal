import { useUserStore } from '@/stores/user';
import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace'

export default {
    computed: {
        isUserAdmin() {
            const userStore = useUserStore();
            const currentWorkspaceStore = useCurrentWorkspaceStore();

            return userStore.id && userStore.id === currentWorkspaceStore.userId;
        }
    }
};
