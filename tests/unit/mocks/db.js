import { db } from '@/plugins/firebase';

export default {
    
    currentUser: () => {
        return db.collection('users').doc('123');
    },
    
    getWorkspace: (name) => {
        return db.collection('users')
            .doc('123')
            .collection('workspaces')
            .doc(name);
    },

    collection: (name) => {
        return db.collection('users')
            .doc('123')
            .collection('workspaces')
            .doc('ws')
            .collection(name);
    }
}