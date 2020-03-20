rm(list = ls())

library(tidyverse)
library(ggmap)
library(rgdal)
library(geojsonio)

# register_google(key = "")

# 2016 data
raw_2016 <- read.csv("iz_kindergarten2016-17_to_2018-19_school_year.csv") %>% 
    filter(CATEGORY == "MMR",
           SCHOOL_YEAR == "2016-2017") %>%
    select(SCHOOL_CODE, SCHOOL_NAME, PUBLIC_PRIVATE, CITY, SCHOOL_CODE, ENROLLMENT, PERCENT) %>% 
    mutate(year = "2016") %>% 
    arrange(desc(PERCENT)) 

# 2017 data
raw_2017 <- read.csv("iz_kindergarten2016-17_to_2018-19_school_year.csv") %>% 
    filter(CATEGORY == "MMR",
           SCHOOL_YEAR == "2017-2018") %>%
    select(SCHOOL_CODE, SCHOOL_NAME, PUBLIC_PRIVATE, CITY, SCHOOL_CODE, ENROLLMENT, PERCENT) %>% 
    mutate(year = "2017") %>% 
    arrange(desc(PERCENT))  

# 2018 data 
raw_2018 <- read.csv("iz_kindergarten2016-17_to_2018-19_school_year.csv") %>% 
    filter(CATEGORY == "MMR",
           SCHOOL_YEAR == "2018-2019") %>%
    select(SCHOOL_CODE, SCHOOL_NAME, PUBLIC_PRIVATE, CITY, SCHOOL_CODE, ENROLLMENT, PERCENT) %>% 
    mutate(year = "2018") %>% 
    arrange(desc(PERCENT))  

combined_data <- rbind(raw_2016, raw_2017, raw_2018) 

# geocode data -- this takes awhile! 
# geocoded_data <- combined %>% 
#     select(SCHOOL_CODE, SCHOOL_NAME, CITY) %>% 
#     distinct() %>% 
#     mutate(lookup_address = paste(SCHOOL_NAME, CITY, ", CA")) %>% 
#     mutate_geocode(lookup_address) %>% 
#     select(SCHOOL_CODE, lat, lon)
# 
# write.csv(geocoded_data, "geocoded-data.csv", row.names = FALSE) # store as csv

geocoded_data <- read.csv("geocoded-data.csv")

# merge with original data
combined_data <- combined_data %>%
    left_join(geocoded_data, by = "SCHOOL_CODE") %>%
    drop_na()

# export as geojson
geojson_write(combined_data, lat = 'lat', lon = 'lon', file = 'ca-schools.geojson')
