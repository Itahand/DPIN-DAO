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
	o.Tx("DAO/founder_vote",
		WithSigner("alice"),
		WithArg("firstOption", "bob"),
		WithArg("secondOption", "alice"),
		WithArg("thirdOption", "tito"),
	).Print()
	// Fetch the votes for the founders topic
	// Bob votes
	/* 	o.Tx("DAO/founder_vote",
		WithSigner("bob"),
		WithArg("firstOption", "bob"),
		WithArg("secondOption", "alice"),
		WithArg("thirdOption", "tito"),
	).Print() */
	o.Script("get_founder_votes").Print()
	o.Script("get_founders").Print()
	// close the founders topic
	/* 	o.Tx("DAO/close_founder_topic",
		WithSigner("bob"),
	).Print() */
	o.Script("get_founders").Print()
	// get unclaimed founders
	o.Script("get_unclaimed_founders").Print()
	// Founder creates a new topic
	/* 	o.Tx("DAO/Founder/create_topic",
	   		WithSigner("bob"),
	   		WithArg("title", "Amount of keys used"),
	   		WithArg("description", "Vote for amount of keys used"),
	   		WithArg("initialOptions", `["10", "20", "30", "40", "50"]`),
	   		WithArg("allowAnyoneAddOptions", true),
	   	).Print()
	   	// alice votes on the new topic
	   	o.Tx("DAO/vote_topic",
	   		WithSigner("alice"),
	   		WithArg("topicId", 1),
	   		WithArg("option", 0),
	   	).Print() */
	o.Script("get_latest_topics").Print()

	/*
		 	o.Tx("DAO/Admin/start_loop",
				WithSigner("tito"),
				WithArg("delaySeconds", "5.0"),
				WithArg("priority", "1"),
				WithArg("executionEffort", "1000"),
				WithArg("transactionData", ``),
			).Print()
	*/
}
