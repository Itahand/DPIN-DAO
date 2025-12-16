package main

import (
	"fmt"

	//if you imports this with .  you do not have to repeat overflow everywhere
	. "github.com/bjartek/overflow/v2"
	"github.com/fatih/color"
)

// ReadFile reads a text file and returns an array of paragraphs

func main() {
	o := Overflow(
		WithGlobalPrintOptions(),
		WithNetwork("testnet"),
	)

	fmt.Println("Testing Contract")

	color.Blue("DAO-Pin Contract testing")

	color.Green("Setup bob account for DAO-Pin collection")
	// Vote on the founders topic
	/* 	o.Tx("DAO/founder_vote",
	   		WithSigner("dpin-dao"),
	   		WithArg("firstOption", "dao-bob"),
	   		WithArg("secondOption", "dao-alice"),
	   		WithArg("thirdOption", "dao-tito"),
	   	).Print()
	   	// Fetch the votes for the founders topic
	   	o.Script("get_founder_votes").Print() */
	// Bob votes
	/* 	o.Tx("DAO/founder_vote",
		WithSigner("dao-bob"),
		WithArg("firstOption", "dao-bob"),
		WithArg("secondOption", "dao-alice"),
		WithArg("thirdOption", "dao-tito"),
	).Print() */
	o.Script("get_founder_votes").Print()
	o.Script("get_founders").Print()
	// close the founders topic
	o.Tx("DAO/close_founder_topic",
		WithSigner("dao-bob"),
	).Print()

}
