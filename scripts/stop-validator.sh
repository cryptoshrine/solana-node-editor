#!/bin/bash
kill -9 $(cat validator.pid)
rm validator.pid
