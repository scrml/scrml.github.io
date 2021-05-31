# Purpose

The point of a variable manager is to manage where the value of a variable is used. It's easiest to understand by example, so let's do that.

Suppose Bob and Alice are two friends. We are interested in the role of Bob's name. Think of `person` as an object type and `name` as a string variable. It seems most natural to make `name` a property of the `person` type, so in that way Bob knows his own name. The question is how does Alice know Bob's name?

The easiest way to do anything is to not do it. Alice doesn't need to know Bob's name. She merely needs to know that Bob is her friend, and if she ever needs to use his name she can ask him. That is, she can just store that the `person` Bob is her friend and if she ever needs his name she can look at Bob's `name` value.

This dynamic access is fine for personal relationships, but suppose that Bob decides to move into an apartment which Alice owns, so she becomes his landlord. She has to write up a rental agreement contract. The contract is a static name-based document. It can't refer to the `person` Bob, it can only use the `name`. "Fine" thinks Alice, "I'll just write down 'Bob' in the contract and all will be well." And she did, and all was well.

One day Bob decides he actually wants his name to be Rob. All he has to do is change his `name` value to "Rob." This does not affect Alice in any way, since she knows him as a person and not as a name. There is no change on her end. he just responds differently when she asks him what his name is.

The situation with the rental contract is not so simple. When Bob changes his name to Rob, the contract will no longer be valid unless the name is changed there. Whose job is it to do this? We say it is Rob's job, since it's his name which is changing. When Bob changes his name to Rob he has to go to the contract and change the name there.

Rob can only do this if he remembers that his name is on the contract. That means that when Alice wrote the contract and used his name, she had to inform Bob that she did that so that he can remember that his name is on it. Then when he changes his name to Rob he can look at his list of all the places where his name is in use (including this contract) and change it there as well as actually changing his own internally stored `name` value.

This is what a variable manager is for. When Bob was born he was given his own variable manager, and he told it that he wants a `name` with the value "Bob." When Alice informed him that she used his name on the contract, he told his variable manager. Then all Bob has to do to change his name is tell his variable manager his new name. It makes all the necessary changes for him, including updating the contract.

# Memory Leak

Variable managers open the potential for a huge memory leak which we need to address. Suppose Alice decides to evict Rob so she can astronomically increase the rent. That's no problem because there is a termination clause in the contract which says how this situation should be handled. Basically all they need to do is both forget about the contract. Once the contract is terminated it should be shredded, since it is no longer needed.

In a garbage collection-based programming language, no object can be shredded unless every (active) party in the world forgets its existence in every way. When Bob and Alice signed the rental agreement, they also set aside some memory for the contract. They both remember it. When Alice evicts Rob they both forget the contract, with the intention of leaving it for the garbage collector to pick up and shred.

But there's a problem. When Alice evicts Rob the world is not right: the contract cannot be shredded even though everybody forgot about it. See, Rob's variable manager remembers that the contract has his name on it, even though he is homeless and is not party to any rental contract. This means the contract still exists in someone's memory somewhere, even though everybody has acknowledged its termination. This is a memory leak, as the contract can't be shredded until Rob forgets that it has his name on it.

The solution we choose takes place when the contract is created. Remember Alice wrote the contract. When she used Bob's name, she told Bob that his name is on the contract. Bob then told his variable manager that his name is on the contract so that it can change it there if he ever decides to change his name. The memory fix is that when Alice tells Bob his name is on the contract, Bob ammends the termination clause so that it states that Bob's variable manager needs to forget that his name is on this contract should it ever be terminated.

Now when Alice evicts Rob they go over the ammended termination clause. First Rob's variable manager forgets that his name is on the contract. Then both Rob and Alice forget the contract. Then nobody remembers the contract, so it can be shredded and Rob can go on his merry way as another casualty of gentrification.

# The Variable Manager

### New Variable/Change Value

Creating a new variable and changing its value is the same process:
```
manager.setVarValue(varName, value);
```

The manager initializes the variable `varName` if necessary, then sets its value to `value`. It then goes through all the object properties and listeners attached to `varName` (there are none at first) and handles them accordingly.

The variable's name `varName` itself will never change. Every variable managed by the manager is accessed by its `varName`. In the example, this would be "name".

### Object Property

This is basically the previous example with the rental contract. It looks like
```
manager.linkProperty(varName, object, property);
```

The manager stores this link in the list of linked objects for the `varName` variable, then sets `object[property]` to the value of the variable `varName`.

Any time `varName`'s value is changed, the manager will update `object[property]` to the new value.

This function returns an unlinking function `unlink()` which, when called, tells the manager to forget this link. This is for avoiding memory leaks.

### Listener

Not every variable can be handled as a static object's property. Sometimes something fancier has to be done. This is what listeners are for. They are attached like
```
manager.linkListener(varName, listener, fireWith = undefined)
```

When the variable `varName`'s value is changed to `newValue`, `listener(newValue)` is called.

If the optional value `fireWith` is given then the manager will call `listener(value, fireWith)` upon linking, where `value` is the current value of the variable `varName`. This is the listener equivalent of initializing `object[property]` for object property links.

This function `linkListener` also returns an unlinking function `unlink()` to avoid memory leaks.