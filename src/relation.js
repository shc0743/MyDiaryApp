const relations = {
    爸爸: {
        爸爸: '爷爷',
        妈妈: '奶奶',
    },
    妈妈: {
        爸爸: '外公',
        妈妈: '外婆',
    },
    儿子: {
        儿子: '孙子',
        女儿: '孙女',
    },
};
export default relations;

function getSecureRandomInt(max) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % max;
}

export function generateQuestion() {
    const familyMembers = Object.keys(relations);
    const member1 = familyMembers[getSecureRandomInt(familyMembers.length)];
    const member2Options = Object.keys(relations[member1]);
    const member2 = member2Options[getSecureRandomInt(member2Options.length)];

    const question = `${member1}的${member2}是什么？`;
    const answer = relations[member1][member2];

    return {
        question,
        answer,
    };
}